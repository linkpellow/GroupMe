/**
 * Leads API Service
 * Unified API client for all leads-related queries.
 * Handles request management, error handling, and response validation.
 */

import axios, { AxiosError, CancelTokenSource } from 'axios';
import axiosInstance from '../api/axiosInstance';
import {
  LeadsQueryState,
  LeadsQueryResponse,
  QueryErrorResponse,
  serializeQueryState,
} from '../types/queryTypes';
import {
  QUERY_CONFIG,
  US_STATES,
  ALLOWED_DISPOSITIONS,
  PIPELINE_SOURCES,
} from '@shared/config/queryConfig';

// Request tracking for cancellation
const requestMap = new Map<string, CancelTokenSource>();

// Generate request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// API response type guards
function isLeadsQueryResponse(data: any): data is LeadsQueryResponse {
  return (
    data &&
    Array.isArray(data.leads) &&
    typeof data.pagination === 'object' &&
    typeof data.pagination.total === 'number' &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.pages === 'number' &&
    typeof data.pagination.limit === 'number'
  );
}

// Error handler
function handleApiError(error: AxiosError): QueryErrorResponse {
  const requestId = generateRequestId();

  if (error.response?.data && typeof error.response.data === 'object') {
    // Server returned an error response
    const data = error.response.data as any;
    return {
      error: data.error || 'An error occurred',
      details: data.details,
      requestId: data.requestId || requestId,
      code: data.code || error.code,
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      error: 'Request timeout',
      requestId,
      code: 'TIMEOUT',
    };
  }

  if (error.message === 'canceled') {
    return {
      error: 'Request was cancelled',
      requestId,
      code: 'CANCELLED',
    };
  }

  return {
    error: error.message || 'Network error',
    requestId,
    code: error.code,
  };
}

// Main API client
export const leadsApi = {
  /**
   * Query leads with the given state
   * Automatically cancels any in-flight requests to the same endpoint
   */
  async queryLeads(queryState: LeadsQueryState): Promise<LeadsQueryResponse> {
    const requestKey = 'leads-query';
    const requestId = generateRequestId();

    // Cancel any existing request
    if (requestMap.has(requestKey)) {
      requestMap.get(requestKey)!.cancel('New request initiated');
      requestMap.delete(requestKey);
    }

    // Create new cancel token
    const source = axios.CancelToken.source();
    requestMap.set(requestKey, source);

    try {
      const startTime = Date.now();
      const params = serializeQueryState(queryState);

      // Add request metadata
      params.set('requestId', requestId);

      const response = await axiosInstance.get<LeadsQueryResponse>('/leads', {
        params,
        cancelToken: source.token,
        headers: {
          'X-Request-ID': requestId,
        },
      });

      const queryTime = Date.now() - startTime;

      // Validate response
      if (!isLeadsQueryResponse(response.data)) {
        throw new Error('Invalid response format');
      }

      // Add query metadata
      const result: LeadsQueryResponse = {
        ...response.data,
        meta: {
          ...response.data.meta,
          queryTime,
          requestId,
          cached: response.headers['x-cache-hit'] === 'true',
        },
      };

      // Log slow queries
      if (queryTime > QUERY_CONFIG.PERFORMANCE.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryTime}ms`, {
          requestId,
          queryState,
        });
      }

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw handleApiError(error);
      }
      throw {
        error: 'Unexpected error',
        requestId,
        code: 'UNKNOWN',
      } as QueryErrorResponse;
    } finally {
      // Clean up request tracking
      if (requestMap.get(requestKey)?.token === source.token) {
        requestMap.delete(requestKey);
      }
    }
  },

  /**
   * Get available filter options (states, dispositions, etc.)
   * This is cached on the server side
   */
  async getFilterOptions(): Promise<{
    states: string[];
    dispositions: string[];
    sources: string[];
  }> {
    try {
      const response = await axiosInstance.get('/leads/filters', {
        headers: {
          'X-Request-ID': generateRequestId(),
        },
      });

      return response.data;
    } catch (error) {
      // Fallback to config values if API fails
      console.error('Failed to fetch filter options, using defaults', error);
      return {
        states: Array.from(US_STATES),
        dispositions: Array.from(ALLOWED_DISPOSITIONS),
        sources: Object.keys(PIPELINE_SOURCES),
      };
    }
  },

  /**
   * Export leads with current filters
   */
  async exportLeads(queryState: LeadsQueryState, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const params = serializeQueryState(queryState);
    params.set('format', format);
    params.delete('page'); // Export all, not just current page
    params.delete('limit');

    const response = await axiosInstance.get('/leads/export', {
      params,
      responseType: 'blob',
      headers: {
        'X-Request-ID': generateRequestId(),
      },
    });

    return response.data;
  },

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    requestMap.forEach((source, key) => {
      source.cancel('All requests cancelled');
      requestMap.delete(key);
    });
  },

  async updateNotes(leadId: string, notes: string) {
    const resp = await axiosInstance.patch(`/api/leads/${leadId}/notes`, { notes });
    return resp.data; // { success: true, leadId, notes }
  },
};

// Add request/response interceptors for debugging in development
if (process.env.NODE_ENV === 'development') {
  axiosInstance.interceptors.request.use(
    (config) => {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params);
      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      console.log(`[API] Response:`, response.data);
      return response;
    },
    (error) => {
      console.error('[API] Response error:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  );
}
