"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUERY_CONFIG = exports.PIPELINE_SOURCES = exports.ALLOWED_DISPOSITIONS = exports.US_STATES = void 0;
exports.validateFilterValue = validateFilterValue;
exports.transformFilterValue = transformFilterValue;
exports.isValidState = isValidState;
exports.isValidDisposition = isValidDisposition;
exports.isValidPipelineSource = isValidPipelineSource;
// Query configuration constants
exports.US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
exports.ALLOWED_DISPOSITIONS = [
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
exports.PIPELINE_SOURCES = {
    all: 'all',
    nextgen: 'Nextgen',
    marketplace: 'Marketplace',
    selfgen: 'Self Generated'
};
exports.QUERY_CONFIG = {
    ALLOWED_FILTERS: {
        status: ['New', 'In Progress', 'Completed'],
        disposition: exports.ALLOWED_DISPOSITIONS,
        state: exports.US_STATES,
        source: Object.values(exports.PIPELINE_SOURCES)
    },
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
    defaultSortDirection: 'desc'
};
// Validation functions
function validateFilterValue(filterKey, value) {
    const allowedValues = exports.QUERY_CONFIG.ALLOWED_FILTERS[filterKey];
    if (!allowedValues)
        return false;
    if (Array.isArray(value)) {
        return value.every(v => allowedValues.includes(v));
    }
    return allowedValues.includes(value);
}
function transformFilterValue(filterKey, value) {
    // Transform filter values if needed
    if (filterKey === 'source' && value === 'all') {
        return undefined; // Remove filter for 'all'
    }
    return value;
}
function isValidState(state) {
    return exports.US_STATES.includes(state);
}
function isValidDisposition(disp) {
    return exports.ALLOWED_DISPOSITIONS.includes(disp);
}
function isValidPipelineSource(src) {
    return Object.values(exports.PIPELINE_SOURCES).includes(src);
}
