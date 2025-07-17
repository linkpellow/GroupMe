import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_UPDATE' | 'BULK_DELETE' | 'IMPORT' | 'EXPORT';
  entityType: 'lead' | 'user' | 'campaign' | 'note' | 'call' | 'document';
  entityId?: mongoose.Types.ObjectId;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    ip?: string;
    userAgent?: string;
    source?: string;
    bulkCount?: number;
    importFile?: string;
  };
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE', 'IMPORT', 'EXPORT'],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['lead', 'user', 'campaign', 'note', 'call', 'document'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: {
      ip: String,
      userAgent: String,
      source: String,
      bulkCount: Number,
      importFile: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Auto-delete old audit logs after 2 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
