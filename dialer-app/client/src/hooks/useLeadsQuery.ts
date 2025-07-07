/**
 * useLeadsQuery Hook
 * Manages the centralized query state for the leads list.
 * Handles debouncing, URL synchronization, and state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  createDefaultQueryState,
  deserializeQueryState,
  LeadsQueryState,
  serializeQueryState,
  validateQueryState,
} from '../types/queryTypes';

interface UseLeadsQueryReturn {
  queryState: LeadsQueryState;
  updateQueryState: (updates: Partial<LeadsQueryState>) => void;
  resetFilters: () => void;
  isDebouncing: boolean;
  errors: Array<{ field: string; message: string }>;
  queryVersion: number;
}

// Local fallback to debounce delay (ms) to avoid runtime dependency on shared package during build
const SEARCH_DELAY_MS = 300;

export function useLeadsQuery(): UseLeadsQueryReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const [queryVersion, setQueryVersion] = useState(0);

  // Initialize state from URL or defaults
  const [queryState, setQueryState] = useState<LeadsQueryState>(() => {
    const params = new URLSearchParams(location.search);
    const deserialized = deserializeQueryState(params);
    const defaultState = createDefaultQueryState();

    // Merge URL params with defaults
    return {
      ...defaultState,
      ...deserialized,
      filters: {
        ...defaultState.filters,
        ...deserialized.filters,
      },
    };
  });

  const [isDebouncing, setIsDebouncing] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state to URL
  const syncToUrl = useCallback(
    (state: LeadsQueryState) => {
      const params = serializeQueryState(state);
      navigate(`?${params.toString()}`, { replace: true });
    },
    [navigate]
  );

  // Update query state with validation
  const updateQueryState = useCallback(
    (updates: Partial<LeadsQueryState>) => {
      setQueryState((prevState) => {
        const newState = {
          ...prevState,
          ...updates,
          filters: updates.filters
            ? {
                ...prevState.filters,
                ...updates.filters,
              }
            : prevState.filters,
        };

        console.log('updateQueryState called with:', updates);
        console.log('New state will be:', newState);
        console.log('Serialized params:', serializeQueryState(newState).toString());

        // Validate the new state
        const validation = validateQueryState(newState);

        if (!validation.valid) {
          setErrors(validation.errors || []);
          return prevState; // Don't update if invalid
        }

        setErrors([]);

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Reset page to 1 when filters/search change
        if (updates.search !== undefined || updates.filters) {
          newState.page = 1;
        }

        // Check if this is just a pipelineSource change
        const isPipelineSourceChange =
          updates.filters &&
          Object.keys(updates.filters).length === 1 &&
          'pipelineSource' in updates.filters;

        // Debounce for search and complex filters, but not for simple dropdown changes
        if ((updates.search !== undefined || updates.filters) && !isPipelineSourceChange) {
          setIsDebouncing(true);

          debounceTimerRef.current = setTimeout(() => {
            syncToUrl(newState);
            setIsDebouncing(false);
          }, SEARCH_DELAY_MS);
        } else {
          // Immediate update for pagination, sorting, and pipelineSource
          syncToUrl(newState);
        }

        setQueryVersion((v) => v + 1);

        return validation.data || newState;
      });
    },
    [syncToUrl]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const defaultState = createDefaultQueryState();
    setQueryState(defaultState);
    syncToUrl(defaultState);
    setErrors([]);
    setQueryVersion((v) => v + 1);
  }, [syncToUrl]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const deserialized = deserializeQueryState(params);
      const defaultState = createDefaultQueryState();

      setQueryState({
        ...defaultState,
        ...deserialized,
        filters: {
          ...defaultState.filters,
          ...deserialized.filters,
        },
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    queryState,
    updateQueryState,
    resetFilters,
    isDebouncing,
    errors,
    queryVersion,
  };
}
