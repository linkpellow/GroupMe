"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AuditLog_1 = require("../models/AuditLog");
const logger_1 = __importDefault(require("../utils/logger"));
class AuditService {
    /**
     * Log a create action
     */
    async logCreate(context, entityType, entityId, data, metadata) {
        try {
            await AuditLog_1.AuditLogModel.create({
                userId: context.userId,
                userEmail: context.userEmail,
                action: 'CREATE',
                entityType,
                entityId,
                metadata: {
                    ...metadata,
                    ip: context.ip,
                    userAgent: context.userAgent,
                    source: metadata?.source || 'API',
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to log audit CREATE:', error);
        }
    }
    /**
     * Log an update action with field changes
     */
    async logUpdate(context, entityType, entityId, changes, metadata) {
        try {
            // Filter out unchanged fields
            const actualChanges = changes.filter((change) => JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue));
            if (actualChanges.length === 0) {
                return;
            }
            await AuditLog_1.AuditLogModel.create({
                userId: context.userId,
                userEmail: context.userEmail,
                action: 'UPDATE',
                entityType,
                entityId,
                changes: actualChanges,
                metadata: {
                    ...metadata,
                    ip: context.ip,
                    userAgent: context.userAgent,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to log audit UPDATE:', error);
        }
    }
    /**
     * Log a delete action
     */
    async logDelete(context, entityType, entityId, deletedData, metadata) {
        try {
            await AuditLog_1.AuditLogModel.create({
                userId: context.userId,
                userEmail: context.userEmail,
                action: 'DELETE',
                entityType,
                entityId,
                metadata: {
                    ...metadata,
                    deletedData,
                    ip: context.ip,
                    userAgent: context.userAgent,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to log audit DELETE:', error);
        }
    }
    /**
     * Log bulk operations
     */
    async logBulkOperation(context, action, entityType, entityIds, metadata) {
        try {
            await AuditLog_1.AuditLogModel.create({
                userId: context.userId,
                userEmail: context.userEmail,
                action,
                entityType,
                metadata: {
                    ...metadata,
                    bulkCount: entityIds.length,
                    entityIds,
                    ip: context.ip,
                    userAgent: context.userAgent,
                },
            });
        }
        catch (error) {
            logger_1.default.error(`Failed to log audit ${action}:`, error);
        }
    }
    /**
     * Log import operations
     */
    async logImport(context, entityType, importFile, recordCount, metadata) {
        try {
            await AuditLog_1.AuditLogModel.create({
                userId: context.userId,
                userEmail: context.userEmail,
                action: 'IMPORT',
                entityType,
                metadata: {
                    ...metadata,
                    importFile,
                    bulkCount: recordCount,
                    ip: context.ip,
                    userAgent: context.userAgent,
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to log audit IMPORT:', error);
        }
    }
    /**
     * Get audit context from request
     */
    getContextFromRequest(req) {
        return {
            userId: req.user?.id || req.user?._id || 'system',
            userEmail: req.user?.email || 'system',
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
        };
    }
    /**
     * Query audit logs
     */
    async queryLogs(filters) {
        const query = {};
        if (filters.userId) {
            query.userId = filters.userId;
        }
        if (filters.entityType) {
            query.entityType = filters.entityType;
        }
        if (filters.entityId) {
            query.entityId = filters.entityId;
        }
        if (filters.action) {
            query.action = filters.action;
        }
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.timestamp.$lte = filters.endDate;
            }
        }
        return AuditLog_1.AuditLogModel.find(query)
            .sort({ timestamp: -1 })
            .limit(filters.limit || 100)
            .populate('userId', 'email name');
    }
    /**
     * Get entity history
     */
    async getEntityHistory(entityType, entityId) {
        return AuditLog_1.AuditLogModel.find({ entityType, entityId })
            .sort({ timestamp: -1 })
            .populate('userId', 'email name');
    }
}
exports.AuditService = AuditService;
exports.default = new AuditService();
