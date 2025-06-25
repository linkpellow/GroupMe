declare module '@shared/config/queryConfig' {
  export const US_STATES: string[];
  export const ALLOWED_DISPOSITIONS: string[];
  export const PIPELINE_SOURCES: {
    all: string;
    nextgen: string;
    marketplace: string;
    selfgen: string;
  };

  export const QUERY_CONFIG: {
    ALLOWED_FILTERS: Record<string, any>;
    ALLOWED_SORTS: Record<string, any>;
    PAGINATION: {
      defaultLimit: number;
      maxLimit: number;
      minLimit: number;
      defaultPage: number;
    };
    PERFORMANCE: {
      maxQueryTime: number;
      slowQueryThreshold: number;
      cacheTime: number;
      debounceDelay: number;
      maxConcurrentRequests: number;
      requestTimeout: number;
    };
    SECURITY: {
      maxSearchLength: number;
      maxFilterValues: number;
      rateLimitPerMinute: number;
    };
    DEBOUNCE: {
      searchDelay: number;
      filterDelay: number;
    };
  };

  export function validateFilterValue(filterKey: string, value: any): boolean;
  export function transformFilterValue(filterKey: string, value: any): any;
  export function isValidState(state: string): boolean;
  export function isValidDisposition(disp: string): boolean;
  export function isValidPipelineSource(src: string): boolean;
}
