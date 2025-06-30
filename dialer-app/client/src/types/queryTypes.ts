/**
 * Type-Safe Query Types
 * This file defines the types for the leads query system.
 * Uses pure TypeScript for type safety without external dependencies.
 */

import type { QUERY_CONFIG } from '@shared/config/queryConfig';

export type StateCode = string;
export type DispositionType = string;

// Query state interface
export interface LeadsQueryState {
  // Pagination
  page: number;
  limit: number;

  // Search
  search?: string;

  // Sorting
  sortBy: 'createdAt'; // Changed from sortField to sortBy
  sortDirection: 'asc' | 'desc';

  // Filters
  filters: {
    states?: string[];
    dispositions?: string[];
    pipelineSource?: 'all' | 'nextgen' | 'marketplace' | 'selfgen' | 'csv' | 'manual' | 'usha';
  };
}

// Response types
export interface LeadsQueryResponse {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  meta: {
    queryTime: number;
    queryVersion?: string;
    cached: boolean;
    requestId: string;
  };
}

// Error response type
export interface QueryErrorResponse {
  error: string;
  details?: Array<{
    path: string[];
    message: string;
  }>;
  requestId: string;
  code?: string;
}

// Lead type (matching the existing Lead interface)
export interface Lead {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  zipcode?: string;
  dob?: string;
  height?: string;
  weight?: string;
  gender?: string;
  state?: string;
  disposition?: string;
  notes?: string;
  source?: string;
  status?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
  city?: string;
  street1?: string;
  street2?: string;
  householdSize?: string;
  householdIncome?: string;
  military?: boolean;
  pregnant?: boolean;
  tobaccoUser?: boolean;
  hasPrescription?: boolean;
  hasMedicarePartsAB?: boolean;
  hasMedicalCondition?: boolean;
  medicalConditions?: string[];
  insuranceTimeframe?: string;
  campaignName?: string;
  product?: string;
  vendorName?: string;
  accountName?: string;
  bidType?: string;
  price?: string;
  callLogId?: string;
  callDuration?: string;
  sourceHash?: string;
  subIdHash?: string;
  vendor_id?: string;
  nextgenId?: string;
}

// Query version tracking
export interface QueryVersion {
  version: number;
  timestamp: number;
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Helper function to create default query state
export function createDefaultQueryState(): LeadsQueryState {
  return {
    page: QUERY_CONFIG.PAGINATION.defaultPage,
    limit: QUERY_CONFIG.PAGINATION.defaultLimit,
    sortBy: 'createdAt', // Changed from sortField to sortBy
    sortDirection: 'desc',
    filters: {
      pipelineSource: 'all',
    },
  };
}

// Helper function to validate query state
export function validateQueryState(state: unknown): {
  valid: boolean;
  errors?: ValidationError[];
  data?: LeadsQueryState;
} {
  const errors: ValidationError[] = [];

  if (!state || typeof state !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Invalid query state object' }],
    };
  }

  const s = state as any;

  // Validate pagination
  if (typeof s.page !== 'number' || s.page < 1) {
    errors.push({
      field: 'page',
      message: 'Page must be a positive number',
      value: s.page,
    });
  }

  if (
    typeof s.limit !== 'number' ||
    s.limit < QUERY_CONFIG.PAGINATION.minLimit ||
    s.limit > QUERY_CONFIG.PAGINATION.maxLimit
  ) {
    errors.push({
      field: 'limit',
      message: `Limit must be between ${QUERY_CONFIG.PAGINATION.minLimit} and ${QUERY_CONFIG.PAGINATION.maxLimit}`,
      value: s.limit,
    });
  }

  // Validate search
  if (s.search !== undefined) {
    if (typeof s.search !== 'string') {
      errors.push({
        field: 'search',
        message: 'Search must be a string',
        value: s.search,
      });
    } else if (s.search.length > QUERY_CONFIG.SECURITY.maxSearchLength) {
      errors.push({
        field: 'search',
        message: `Search must be less than ${QUERY_CONFIG.SECURITY.maxSearchLength} characters`,
        value: s.search,
      });
    }
  }

  // Validate sorting
  if (s.sortBy !== 'createdAt') {
    // Changed from sortField to sortBy
    errors.push({
      field: 'sortBy', // Changed from sortField to sortBy
      message: 'Invalid sort field',
      value: s.sortBy, // Changed from sortField to sortBy
    });
  }

  if (s.sortDirection !== 'asc' && s.sortDirection !== 'desc') {
    errors.push({
      field: 'sortDirection',
      message: 'Sort direction must be "asc" or "desc"',
      value: s.sortDirection,
    });
  }

  // Validate filters
  if (s.filters) {
    if (
      s.filters.states &&
      (!Array.isArray(s.filters.states) ||
        s.filters.states.length > QUERY_CONFIG.SECURITY.maxFilterValues)
    ) {
      errors.push({
        field: 'filters.states',
        message: `States must be an array with max ${QUERY_CONFIG.SECURITY.maxFilterValues} items`,
        value: s.filters.states,
      });
    }

    if (
      s.filters.dispositions &&
      (!Array.isArray(s.filters.dispositions) ||
        s.filters.dispositions.length > QUERY_CONFIG.SECURITY.maxFilterValues)
    ) {
      errors.push({
        field: 'filters.dispositions',
        message: `Dispositions must be an array with max ${QUERY_CONFIG.SECURITY.maxFilterValues} items`,
        value: s.filters.dispositions,
      });
    }

    if (
      s.filters.pipelineSource &&
      !['all', 'nextgen', 'marketplace', 'selfgen', 'csv', 'manual', 'usha'].includes(
        s.filters.pipelineSource
      )
    ) {
      errors.push({
        field: 'filters.pipelineSource',
        message: 'Invalid pipeline source',
        value: s.filters.pipelineSource,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Clean and return the validated state
  const validatedState: LeadsQueryState = {
    page: s.page,
    limit: s.limit,
    sortBy: s.sortBy, // Changed from sortField to sortBy
    sortDirection: s.sortDirection,
    filters: {
      states: s.filters?.states?.filter((s: string) => s.length > 0),
      dispositions: s.filters?.dispositions?.filter((d: string) => d.length > 0),
      pipelineSource: s.filters?.pipelineSource || 'all',
    },
  };

  if (typeof s.search === 'string') {
    // Preserve spaces as typed so the UI reflects input accurately
    validatedState.search = s.search;
  }

  return { valid: true, data: validatedState };
}

// Helper function to serialize query state for URL params
export function serializeQueryState(state: LeadsQueryState): URLSearchParams {
  const params = new URLSearchParams();

  // Add basic parameters
  params.set('page', state.page.toString());
  params.set('limit', state.limit.toString());
  params.set('sortBy', state.sortBy);
  params.set('sortDirection', state.sortDirection);

  // Add search if present
  if (state.search) {
    params.set('search', state.search);
  }

  // Add filters
  if (state.filters?.states && state.filters.states.length > 0) {
    params.set('states', state.filters.states.join(','));
  }

  if (state.filters?.dispositions && state.filters.dispositions.length > 0) {
    params.set('dispositions', state.filters.dispositions.join(','));
  }

  if (state.filters?.pipelineSource && state.filters.pipelineSource !== 'all') {
    params.set('pipelineSource', state.filters.pipelineSource);
  }

  return params;
}

// Helper function to deserialize query state from URL params
export function deserializeQueryState(params: URLSearchParams): Partial<LeadsQueryState> {
  const state: Partial<LeadsQueryState> = {};

  // Parse basic parameters
  if (params.has('page')) {
    const page = parseInt(params.get('page')!, 10);
    if (!isNaN(page) && page > 0) {
      state.page = page;
    }
  }

  if (params.has('limit')) {
    const limit = parseInt(params.get('limit')!, 10);
    if (
      !isNaN(limit) &&
      limit >= QUERY_CONFIG.PAGINATION.minLimit &&
      limit <= QUERY_CONFIG.PAGINATION.maxLimit
    ) {
      state.limit = limit;
    }
  }

  if (params.has('sortBy') && params.get('sortBy') === 'createdAt') {
    state.sortBy = 'createdAt'; // Changed from sortField to sortBy
  }

  if (params.has('sortDirection')) {
    const dir = params.get('sortDirection');
    if (dir === 'asc' || dir === 'desc') {
      state.sortDirection = dir;
    }
  }

  if (params.has('search')) {
    const search = params.get('search')!;
    if (search.length <= QUERY_CONFIG.SECURITY.maxSearchLength) {
      state.search = search;
    }
  }

  // Parse filters
  state.filters = {};

  if (params.has('states')) {
    const states = params
      .get('states')!
      .split(',')
      .filter((s) => s);
    if (states.length <= QUERY_CONFIG.SECURITY.maxFilterValues) {
      state.filters.states = states;
    }
  }

  if (params.has('dispositions')) {
    const dispositions = params
      .get('dispositions')!
      .split(',')
      .filter((d) => d);
    if (dispositions.length <= QUERY_CONFIG.SECURITY.maxFilterValues) {
      state.filters.dispositions = dispositions;
    }
  }

  if (params.has('pipelineSource')) {
    const source = params.get('pipelineSource') as any;
    if (['all', 'nextgen', 'marketplace', 'selfgen', 'csv', 'manual', 'usha'].includes(source)) {
      state.filters.pipelineSource = source;
    }
  }

  return state;
}
