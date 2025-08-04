/**
 * Leads Page Data Hook
 * Combines all the new query system hooks for easy integration into the existing Leads component.
 * This provides a bridge between the old implementation and the new query system.
 */

import { useLeadsQuery } from './useLeadsQuery';
import { useLeadsData, useFilterOptions } from './useLeadsData';
import { Lead, LeadsQueryResponse, LeadsQueryState } from '../types/queryTypes';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../services/leadsApi';

export interface UseLeadsPageDataReturn {
  // Query state management
  queryState: ReturnType<typeof useLeadsQuery>;

  // Leads data
  leads: Lead[];
  isLoading: boolean;
  error: Error | null;
  totalLeads: number;
  totalPages: number;
  currentPage: number;

  // Filter options
  availableStates: string[];
  availableDispositions: string[];

  // Actions
  refetch: () => void;

  // Direct setters for compatibility
  setCurrentPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStates: (states: string[]) => void;
  setSelectedDispositions: (dispositions: string[]) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  setSelectedPipeline: (pipeline: string) => void;
}

export function useLeadsPageData(queryState: LeadsQueryState): UseLeadsPageDataReturn {
  const { search, filters, page, limit, sortBy, sortDirection, getAllResults, requestId } =
    queryState;

  const queryKey = [
    'leads-page',
    search,
    filters,
    page,
    limit,
    sortBy,
    sortDirection,
    getAllResults,
    requestId,
  ];

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<LeadsQueryResponse, Error>({
    queryKey: queryKey,
    queryFn: () => {
      console.log('[useLeadsPageData] Fetching leads with queryState:', queryState);
      return leadsApi.queryLeads(queryState) as Promise<LeadsQueryResponse>;
    },
    placeholderData: (prev: LeadsQueryResponse | undefined) => prev,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Logging handled by Axios interceptors inside leadsApi
  });

  // Use our centralized query state management
  const queryHook = useLeadsQuery();
  const { updateQueryState, queryVersion } = queryHook;

  // Get filter options
  const { data: filterOptions } = useFilterOptions();

  // Use the leads data hook with our query state
  const leadsData = useLeadsData({
    queryState,
    queryVersion,
    enabled: true,
  });

  // Extract data with defaults
  const leads = data?.leads ?? [];
  const totalLeads = leadsData.pagination?.total || 0;
  const totalPages = leadsData.pagination?.pages || 1;
  const currentPage = queryState.page;

  // Extract filter options with defaults
  const availableStates = filterOptions?.states || [];
  const availableDispositions = filterOptions?.dispositions || [];

  // Create compatibility setters that map to our query state
  const setCurrentPage = (page: number) => updateQueryState({ page });
  const setSearchQuery = (query: string) => updateQueryState({ search: query });
  const setSelectedStates = (states: string[]) =>
    updateQueryState({
      filters: { ...queryState.filters, states },
    });
  const setSelectedDispositions = (dispositions: string[]) =>
    updateQueryState({
      filters: { ...queryState.filters, dispositions },
    });
  const setSortDirection = (direction: 'asc' | 'desc') =>
    updateQueryState({
      sortDirection: direction,
    });
  const setSelectedPipeline = (pipeline: string) =>
    updateQueryState({
      filters: {
        ...queryState.filters,
        pipelineSource: pipeline as
          | 'all'
          | 'nextgen'
          | 'marketplace'
          | 'selfgen'
          | 'csv'
          | 'manual'
          | 'usha'
          | undefined,
      },
    });

  return {
    // Query state for advanced usage
    queryState: queryHook,

    // Leads data
    leads,
    isLoading: leadsData.isLoading,
    error: leadsData.error,
    totalLeads,
    totalPages,
    currentPage,

    // Filter options
    availableStates,
    availableDispositions,

    // Actions
    refetch: leadsData.refetch,

    // Compatibility setters
    setCurrentPage,
    setSearchQuery,
    setSelectedStates,
    setSelectedDispositions,
    setSortDirection,
    setSelectedPipeline,
  };
}

// Helper hook for handling pagination separately if needed
export function useLeadsPagination(
  totalPages: number,
  currentPage: number,
  setPage: (page: number) => void
) {
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  return {
    handlePrevPage,
    handleNextPage,
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < totalPages,
  };
}
