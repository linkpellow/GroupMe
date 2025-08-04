"use strict";
/**
 * Query Builder Service
 * Converts validated query parameters into MongoDB queries.
 * Single source of truth for all database query construction.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilderService = void 0;
class QueryBuilderService {
    /**
     * Build MongoDB query from validated parameters
     */
    static buildLeadsQuery(params) {
        const filter = {};
        // Pagination
        const page = Math.max(1, params.page || 1);
        // If getAllResults is true, set a very high limit
        const limit = params.getAllResults
            ? 10000
            : Math.min(100, Math.max(10, params.limit || 50));
        const skip = (page - 1) * limit;
        // Search
        if (params.search && params.search.trim()) {
            const searchRegex = new RegExp(params.search.trim(), 'i');
            filter.$or = [
                { name: { $regex: searchRegex } },
                { firstName: { $regex: searchRegex } },
                { lastName: { $regex: searchRegex } },
                { email: { $regex: searchRegex } },
                { phone: { $regex: searchRegex } },
            ];
        }
        // State filter
        if (params.states && params.states.length > 0) {
            filter.state = { $in: params.states };
        }
        // Disposition filter – include special token "No Disposition"
        if (params.dispositions && params.dispositions.length > 0) {
            const dispositions = [...params.dispositions];
            const includeNoDisp = dispositions.includes('No Disposition');
            // Remove the token so it is not treated as literal value in $in
            const filtered = dispositions.filter((d) => d !== 'No Disposition');
            const noDispConditions = [
                { disposition: { $in: [null, ''] } },
                { disposition: { $exists: false } },
            ];
            if (includeNoDisp && filtered.length > 0) {
                const orArray = [];
                orArray.push({ disposition: { $in: filtered } });
                orArray.push(...noDispConditions);
                filter.$or = filter.$or ? [...filter.$or, ...orArray] : orArray;
            }
            else if (includeNoDisp) {
                const orArray = noDispConditions;
                filter.$or = filter.$or ? [...filter.$or, ...orArray] : orArray;
            }
            else {
                filter.disposition = { $in: filtered };
            }
        }
        // Source filter
        if (params.sources && params.sources.length > 0) {
            filter.source = { $in: params.sources };
        }
        // Pipeline source filter (for specific source like NextGen, Marketplace, etc.)
        if (params.pipelineSource && params.pipelineSource !== 'all') {
            // Map the pipelineSource values to actual source values in the database
            const sourceMap = {
                nextgen: 'NextGen',
                marketplace: 'Marketplace',
                selfgen: 'Self Generated',
                csv: 'CSV Import',
                manual: 'Manual Entry',
                usha: 'Usha',
            };
            console.log('[QueryBuilder] Applying pipeline filter:', params.pipelineSource);
            if (sourceMap[params.pipelineSource]) {
                filter.source = sourceMap[params.pipelineSource];
                console.log('[QueryBuilder] Mapped to source:', filter.source);
            }
        }
        // Sorting
        const sort = {};
        // Support both sortField and sortBy for backward compatibility
        const sortBy = params.sortBy || params.sortField || 'createdAt';
        const sortDirection = params.sortDirection === 'asc' ? 1 : -1;
        sort[sortBy] = sortDirection;
        return {
            filter,
            sort,
            skip,
            limit,
            page,
        };
    }
    /**
     * Build aggregation pipeline for complex queries
     */
    static buildAggregationPipeline(params) {
        const { filter, sort, skip, limit } = this.buildLeadsQuery(params);
        const pipeline = [{ $match: filter }];
        // Add any lookups or computed fields here
        // Example: { $lookup: { from: 'othercollection', ... } }
        // Sort
        if (Object.keys(sort).length > 0) {
            pipeline.push({ $sort: sort });
        }
        // Count total before pagination
        pipeline.push({
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        });
        // Reshape the output
        pipeline.push({
            $project: {
                data: 1,
                total: { $arrayElemAt: ['$metadata.total', 0] },
            },
        });
        return pipeline;
    }
    /**
     * Get index hints for optimized queries
     */
    static getIndexHints(params) {
        const hints = [];
        // Compound index recommendations based on filters and sort
        if (params.search) {
            hints.push('text_index'); // Assumes text index on searchable fields
        }
        if (params.states && params.sortBy === 'createdAt') {
            hints.push('state_createdAt_compound');
        }
        if (params.dispositions && params.sortBy === 'createdAt') {
            hints.push('disposition_createdAt_compound');
        }
        if (!params.states && !params.dispositions && params.sortBy === 'createdAt') {
            hints.push('createdAt_single');
        }
        return hints;
    }
    /**
     * Validate query performance
     */
    static validateQueryPerformance(params) {
        const warnings = [];
        // Check for potentially slow queries
        if (params.search && params.search.length < 3) {
            warnings.push('Search term too short, may result in slow query');
        }
        if (params.states && params.states.length > 10) {
            warnings.push('Large number of states in filter may impact performance');
        }
        if (params.limit && params.limit > 50) {
            warnings.push('Large page size may impact response time');
        }
        return {
            valid: warnings.length === 0,
            warnings,
        };
    }
    static buildQuery(params) {
        const query = {};
        // Add search filter if provided
        if (params.search && params.search.trim()) {
            const searchRegex = new RegExp(params.search.trim(), 'i');
            query.$or = [
                { name: { $regex: searchRegex } },
                { firstName: { $regex: searchRegex } },
                { lastName: { $regex: searchRegex } },
                { email: { $regex: searchRegex } },
                { phone: { $regex: searchRegex } },
            ];
        }
        // Add state filter
        if (params.states && params.states.length > 0) {
            query.state = { $in: params.states };
        }
        // Add disposition filter with "No Disposition" handling
        if (params.dispositions && params.dispositions.length > 0) {
            const dispositions = [...params.dispositions];
            const includeNoDisp = dispositions.includes('No Disposition');
            const filtered = dispositions.filter((d) => d !== 'No Disposition');
            const noDispConditions = [
                { disposition: { $in: [null, ''] } },
                { disposition: { $exists: false } },
            ];
            if (includeNoDisp && filtered.length > 0) {
                const orArray = [];
                orArray.push({ disposition: { $in: filtered } });
                orArray.push(...noDispConditions);
                query.$or = query.$or ? [...query.$or, ...orArray] : orArray;
            }
            else if (includeNoDisp) {
                const orArray = noDispConditions;
                query.$or = query.$or ? [...query.$or, ...orArray] : orArray;
            }
            else {
                query.disposition = { $in: filtered };
            }
        }
        // Add source filter
        if (params.sources && params.sources.length > 0) {
            query.source = { $in: params.sources };
        }
        // Add pipeline source filter
        if (params.pipelineSource && params.pipelineSource !== 'all') {
            const sourceMap = {
                nextgen: 'NextGen',
                marketplace: 'Marketplace',
                selfgen: 'Self Generated',
                csv: 'CSV Import',
                manual: 'Manual Entry',
                usha: 'Usha',
            };
            console.log('[QueryBuilder.buildQuery] Applying pipeline filter:', params.pipelineSource);
            if (sourceMap[params.pipelineSource]) {
                query.source = sourceMap[params.pipelineSource];
                console.log('[QueryBuilder.buildQuery] Mapped to source:', query.source);
            }
        }
        return query;
    }
    static buildSortOptions(params) {
        const sortBy = params.sortBy || 'createdAt';
        const sortDirection = params.sortDirection === 'asc' ? 1 : -1;
        return { [sortBy]: sortDirection };
    }
    static validatePagination(params) {
        const page = Math.max(1, parseInt(String(params.page)) || 1);
        const limit = Math.min(100, Math.max(10, parseInt(String(params.limit)) || 50));
        return { page, limit };
    }
}
exports.QueryBuilderService = QueryBuilderService;
