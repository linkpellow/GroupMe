import { Request } from 'express';
import { AuditLogModel, IAuditLog } from '../models/AuditLog';
import logger from '../utils/logger';

export interface AuditContext {
  userId: string;
  userEmail: string;
  ip?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Log a create action
   */
  async logCreate(
    context: AuditContext,
    entityType: IAuditLog['entityType'],
    entityId: string,
    data: any,
    metadata?: any
  ) {
    try {
      await AuditLogModel.create({
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
    } catch (error) {
      logger.error('Failed to log audit CREATE:', error);
    }
  }

  /**
   * Log an update action with field changes
   */
  async logUpdate(
    context: AuditContext,
    entityType: IAuditLog['entityType'],
    entityId: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
    metadata?: any
  ) {
    try {
      // Filter out unchanged fields
      const actualChanges = changes.filter(
        (change) => JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue)
      );

      if (actualChanges.length === 0) {
        return;
      }

      await AuditLogModel.create({
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
    } catch (error) {
      logger.error('Failed to log audit UPDATE:', error);
    }
  }

  /**
   * Log a delete action
   */
  async logDelete(
    context: AuditContext,
    entityType: IAuditLog['entityType'],
    entityId: string,
    deletedData?: any,
    metadata?: any
  ) {
    try {
      await AuditLogModel.create({
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
    } catch (error) {
      logger.error('Failed to log audit DELETE:', error);
    }
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(
    context: AuditContext,
    action: 'BULK_UPDATE' | 'BULK_DELETE',
    entityType: IAuditLog['entityType'],
    entityIds: string[],
    metadata?: any
  ) {
    try {
      await AuditLogModel.create({
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
    } catch (error) {
      logger.error(`Failed to log audit ${action}:`, error);
    }
  }

  /**
   * Log import operations
   */
  async logImport(
    context: AuditContext,
    entityType: IAuditLog['entityType'],
    importFile: string,
    recordCount: number,
    metadata?: any
  ) {
    try {
      await AuditLogModel.create({
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
    } catch (error) {
      logger.error('Failed to log audit IMPORT:', error);
    }
  }

  /**
   * Get audit context from request
   */
  getContextFromRequest(req: Request & { user?: any }): AuditContext {
    return {
      userId: req.user?.id || req.user?._id || 'system',
      userEmail: req.user?.email || 'system',
      ip: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent'],
    };
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const query: any = {};

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

    return AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .populate('userId', 'email name');
  }

  /**
   * Get entity history
   */
  async getEntityHistory(entityType: string, entityId: string) {
    return AuditLogModel.find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .populate('userId', 'email name');
  }
}

export default new AuditService();
