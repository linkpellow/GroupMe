export declare const US_STATES: string[];
export declare const ALLOWED_DISPOSITIONS: string[];
export declare const PIPELINE_SOURCES: {
    all: string;
    nextgen: string;
    marketplace: string;
    selfgen: string;
};
export declare const QUERY_CONFIG: {
    ALLOWED_FILTERS: Record<string, string[]>;
    ALLOWED_SORTS: {
        createdAt: string[];
        updatedAt: string[];
        name: string[];
        status: string[];
        disposition: string[];
    };
    PAGINATION: {
        defaultPage: number;
        defaultLimit: number;
        minLimit: number;
        maxLimit: number;
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
    defaultLimit: number;
    maxLimit: number;
    allowedSortFields: string[];
    defaultSortField: string;
    defaultSortDirection: "desc";
};
export declare function validateFilterValue(filterKey: string, value: any): boolean;
export declare function transformFilterValue(filterKey: string, value: any): any;
export declare function isValidState(state: string): boolean;
export declare function isValidDisposition(disp: string): boolean;
export declare function isValidPipelineSource(src: string): boolean;
