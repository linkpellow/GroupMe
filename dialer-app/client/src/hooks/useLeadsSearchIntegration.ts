/**
 * Leads Search Integration Hook
 * Production-grade bridge between Leads.tsx and the centralized query system.
 * Handles search through server-side queries instead of client-side filtering.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLeadsQuery } from './useLeadsQuery';
import { useLeadsData } from './useLeadsData';
import axiosInstance from '../api/axiosInstance';
import { Lead } from '../types/queryTypes';

interface UseLeadsSearchIntegrationProps {
  sortDirection: 'new' | 'aged';
  selectedStates: string[];
  selectedDispositions: string[];
  selectedPipeline: string;
  currentPage: number;
  setLeads: (leads: Lead[]) => void;
  setTotalLeads: (total: number) => void;
  setTotalPages: (pages: number) => void;
  setIsLoading: (loading: boolean) => void;
  getStateParams: (states: string[]) => any;
  showToast: (config: any) => void;
}

interface UseLeadsSearchIntegrationReturn {
  handleSearch: (searchQuery: string) => void;
  isSearchActive: boolean;
  clearSearch: () => void;
}

export function useLeadsSearchIntegration({
  sortDirection,
  selectedStates,
  selectedDispositions,
  selectedPipeline,
  currentPage,
  setLeads,
  setTotalLeads,
  setTotalPages,
  setIsLoading,
  getStateParams,
  showToast,
}: UseLeadsSearchIntegrationProps): UseLeadsSearchIntegrationReturn {
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track if search is active
  const isSearchActive = useRef(false);

  /**
   * Shared function to build API parameters
   */
  const buildApiParams = useCallback(
    (searchQuery: string | null, page: number) => {
      const params: any = {
        page,
        sortDirection,
        ...getStateParams(selectedStates),
      };

      // Add search if provided
      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add dispositions if selected
      if (selectedDispositions.length > 0) {
        params.dispositions = selectedDispositions.join(',');
      }

      // Add pipeline source
      if (selectedPipeline !== 'all') {
        params.pipelineSource =
          selectedPipeline === 'nextgen'
            ? 'NextGen'
            : selectedPipeline === 'marketplace'
              ? 'Marketplace'
              : selectedPipeline === 'selfgen'
                ? 'Self Generated'
                : 'All';
      }

      return params;
    },
    [sortDirection, selectedStates, selectedDispositions, selectedPipeline, getStateParams]
  );

  /**
   * Shared function to fetch leads
   */
  const fetchLeads = useCallback(
    async (searchQuery: string | null, page: number, controller: AbortController) => {
      try {
        const response = await axiosInstance.get('/api/leads', {
          params: buildApiParams(searchQuery, page),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        // Update state with results
        setLeads(response.data.leads || []);
        setTotalLeads(response.data.pagination.total || 0);
        setTotalPages(response.data.pagination.pages || 1);
        setIsLoading(false);

        // Handle search-specific notifications
        if (searchQuery) {
          console.log(
            `✅ Search found ${response.data.pagination.total} leads matching "${searchQuery}"`
          );

          if (response.data.pagination.total === 0) {
            showToast({
              title: 'No results',
              description: `No leads found matching "${searchQuery}"`,
              status: 'info',
              duration: 2000,
              isClosable: true,
            });
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        console.error(searchQuery ? 'Search failed:' : 'Failed to fetch leads:', err);
        setIsLoading(false);

        showToast({
          title: searchQuery ? 'Search Error' : 'Error',
          description: searchQuery
            ? 'Failed to search leads. Please try again.'
            : 'Failed to fetch leads',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [buildApiParams, setLeads, setTotalLeads, setTotalPages, setIsLoading, showToast]
  );

  /**
   * Handles search with debouncing and proper server-side querying
   */
  const handleSearch = useCallback(
    (searchQuery: string) => {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Store the search query
      lastSearchRef.current = searchQuery.trim();

      // If search is empty, clear search mode and fetch normal results
      if (!searchQuery.trim()) {
        isSearchActive.current = false;
        setIsLoading(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        fetchLeads(null, currentPage, controller);
        return;
      }

      // Debounce search requests
      searchTimeoutRef.current = setTimeout(() => {
        isSearchActive.current = true;
        setIsLoading(true);

        console.log('🔍 Performing server-side search for:', searchQuery);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Always start at page 1 for new search
        fetchLeads(searchQuery.trim(), 1, controller);
      }, 300); // 300ms debounce
    },
    [currentPage, fetchLeads]
  );

  /**
   * Clear search and return to normal pagination
   */
  const clearSearch = useCallback(() => {
    lastSearchRef.current = '';
    isSearchActive.current = false;
    handleSearch('');
  }, [handleSearch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Re-run search when filters change
   */
  useEffect(() => {
    if (isSearchActive.current && lastSearchRef.current) {
      handleSearch(lastSearchRef.current);
    }
  }, [selectedStates, selectedDispositions, selectedPipeline, sortDirection]);

  return {
    handleSearch,
    isSearchActive: isSearchActive.current,
    clearSearch,
  };
}
