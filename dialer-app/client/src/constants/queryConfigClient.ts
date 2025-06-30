export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
] as const;

export const ALLOWED_DISPOSITIONS = [
  'Positive Contact',
  'Negative Contact',
  'Employer Coverage',
  'Brokie',
  'Buy Or Die',
  'Unhealthy/Referred',
  'Foreign',
  'Quoted',
  'SOLD',
  'Appointment',
  'No Contact',
  'Invalid/Disconnected',
  'Hung Up',
  'Ghosted',
  'New Lead',
] as const;

export const PIPELINE_SOURCES = {
  all: 'all',
  nextgen: 'nextgen',
  marketplace: 'marketplace',
  selfgen: 'selfgen',
  manual: 'manual',
} as const;

export const QUERY_CONFIG = {
  PAGINATION: {
    defaultPage: 1,
    defaultLimit: 50,
    minLimit: 10,
    maxLimit: 500,
  },
  SECURITY: {
    maxSearchLength: 100,
    maxFilterValues: 50,
  },
  PERFORMANCE: {
    cacheTime: 5 * 60 * 1000, // 5 minutes
    slowQueryThreshold: 1000, // ms
  },
  DEBOUNCE: {
    searchDelay: 300,
  },
} as const; 