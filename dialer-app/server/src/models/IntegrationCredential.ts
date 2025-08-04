import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationProvider = 'groupme' | 'calendly' | 'textdrip' | 'gmail';

export interface IIntegrationCredential extends Document {
  tenantId: mongoose.Types.ObjectId;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationCredentialSchema = new Schema<IIntegrationCredential>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: {
      type: String,
      enum: ['groupme', 'calendly', 'textdrip', 'gmail'],
      required: true,
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    expiresAt: { type: Date },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

IntegrationCredentialSchema.index({ tenantId: 1, provider: 1 }, { unique: true });

export default mongoose.model<IIntegrationCredential>('IntegrationCredential', IntegrationCredentialSchema); 