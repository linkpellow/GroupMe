/**
 * useLeadsData Hook
 * React Query integration for leads data fetching.
 * Provides caching, loading states, error handling, and automatic refetching.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeadsQueryState, LeadsQueryResponse, QueryErrorResponse } from '../types/queryTypes';
import { leadsApi } from '../services/leadsApi';
import { QUERY_CONFIG } from '../constants/queryConfigClient';

interface UseLeadsDataOptions {
  queryState: LeadsQueryState;
  queryVersion: number;
  enabled?: boolean;
}

interface UseLeadsDataReturn {
  leads: any[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  refetch: () => void;
  queryTime?: number;
  isCached?: boolean;
}

// Generate stable query key from state
function getQueryKey(
  queryState: LeadsQueryState,
  version: number
): [string, LeadsQueryState, number] {
  return ['leads', queryState, version];
}

export function useLeadsData({
  queryState,
  queryVersion,
  enabled = true,
}: UseLeadsDataOptions): UseLeadsDataReturn {
  const queryClient = useQueryClient();

  const query = useQuery<LeadsQueryResponse, QueryErrorResponse>({
    queryKey: getQueryKey(queryState, queryVersion),
    queryFn: () => leadsApi.queryLeads(queryState),
    enabled,
    staleTime: QUERY_CONFIG.PERFORMANCE.cacheTime,
    gcTime: QUERY_CONFIG.PERFORMANCE.cacheTime * 2,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error?.code?.startsWith('4')) return false;
      // Retry up to 2 times for server/network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch next page for smoother pagination
  const prefetchNextPage = () => {
    const data = query.data;
    if (data && queryState.page < data.pagination.pages) {
      const nextPageState = { ...queryState, page: queryState.page + 1 };
      queryClient.prefetchQuery({
        queryKey: getQueryKey(nextPageState, queryVersion),
        queryFn: () => leadsApi.queryLeads(nextPageState),
        staleTime: QUERY_CONFIG.PERFORMANCE.cacheTime,
      });
    }
  };

  // Prefetch previous page
  const prefetchPrevPage = () => {
    const data = query.data;
    if (data && queryState.page > 1) {
      const prevPageState = { ...queryState, page: queryState.page - 1 };
      queryClient.prefetchQuery({
        queryKey: getQueryKey(prevPageState, queryVersion),
        queryFn: () => leadsApi.queryLeads(prevPageState),
        staleTime: QUERY_CONFIG.PERFORMANCE.cacheTime,
      });
    }
  };

  // Trigger prefetching when data is loaded
  if (query.isSuccess && !query.isFetching && query.data) {
    // Use setTimeout to avoid blocking the render
    setTimeout(() => {
      prefetchNextPage();
      prefetchPrevPage();
    }, 100);
  }

  // Log slow queries on success
  if (
    query.isSuccess &&
    query.data?.meta.queryTime &&
    query.data.meta.queryTime > QUERY_CONFIG.PERFORMANCE.slowQueryThreshold
  ) {
    console.warn('Slow query detected:', {
      time: query.data.meta.queryTime,
      queryState,
    });
  }

  return {
    leads: query.data?.leads || [],
    pagination: query.data?.pagination || {
      total: 0,
      page: queryState.page,
      pages: 0,
      limit: queryState.limit,
    },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    isFetching: query.isFetching,
    refetch: query.refetch,
    queryTime: query.data?.meta?.queryTime,
    isCached: query.data?.meta?.cached,
  };
}

// Hook for filter options
export function useFilterOptions() {
  return useQuery<{
    states: string[];
    dispositions: string[];
    sources: string[];
  }>({
    queryKey: ['filterOptions'],
    queryFn: () => leadsApi.getFilterOptions(),
    staleTime: Infinity, // These rarely change
    gcTime: Infinity, // v5 uses gcTime instead of cacheTime
    retry: false, // Use local fallback if fails
    initialData: {
      states: [],
      dispositions: [],
      sources: [],
    },
  });
}
