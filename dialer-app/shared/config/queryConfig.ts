// Query configuration constants
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const ALLOWED_DISPOSITIONS = [
  'New Lead',
  'No Answer',
  'Voicemail',
  'Callback',
  'Not Interested',
  'Wrong Number',
  'Do Not Call',
  'Interested',
  'Follow Up',
  'Sold',
  'Lost',
  'SOLD'
];

export const PIPELINE_SOURCES = {
  all: 'all',
  nextgen: 'Nextgen',
  marketplace: 'Marketplace',
  selfgen: 'Self Generated'
};

export const QUERY_CONFIG = {
  ALLOWED_FILTERS: {
    status: ['New', 'In Progress', 'Completed'],
    disposition: ALLOWED_DISPOSITIONS,
    state: US_STATES,
    source: Object.values(PIPELINE_SOURCES)
  } as Record<string, string[]>,
  ALLOWED_SORTS: {
    createdAt: ['asc', 'desc'],
    updatedAt: ['asc', 'desc'],
    name: ['asc', 'desc'],
    status: ['asc', 'desc'],
    disposition: ['asc', 'desc']
  },
  PAGINATION: {
    defaultPage: 1,
    defaultLimit: 50,
    minLimit: 10,
    maxLimit: 500
  },
  PERFORMANCE: {
    maxQueryTime: 5000,
    slowQueryThreshold: 1000,
    cacheTime: 5 * 60 * 1000, // 5 minutes
    debounceDelay: 300,
    maxConcurrentRequests: 5,
    requestTimeout: 30000
  },
  SECURITY: {
    maxSearchLength: 100,
    maxFilterValues: 50,
    rateLimitPerMinute: 60
  },
  DEBOUNCE: {
    searchDelay: 300,
    filterDelay: 200
  },
  // Backwards compatibility
  defaultLimit: 50,
  maxLimit: 500,
  allowedSortFields: ['createdAt', 'updatedAt', 'name', 'status', 'disposition'],
  defaultSortField: 'createdAt',
  defaultSortDirection: 'desc' as const
};

// Validation functions
export function validateFilterValue(filterKey: string, value: any): boolean {
  const allowedValues = QUERY_CONFIG.ALLOWED_FILTERS[filterKey];
  if (!allowedValues) return false;
  
  if (Array.isArray(value)) {
    return value.every(v => allowedValues.includes(v));
  }
  
  return allowedValues.includes(value);
}

export function transformFilterValue(filterKey: string, value: any): any {
  // Transform filter values if needed
  if (filterKey === 'source' && value === 'all') {
    return undefined; // Remove filter for 'all'
  }
  return value;
}

export function isValidState(state: string): boolean {
  return US_STATES.includes(state);
}

export function isValidDisposition(disp: string): boolean {
  return ALLOWED_DISPOSITIONS.includes(disp);
}

export function isValidPipelineSource(src: string): boolean {
  return Object.values(PIPELINE_SOURCES).includes(src);
} 