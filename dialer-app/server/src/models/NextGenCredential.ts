import mongoose, { Schema, Document } from 'mongoose';

export interface INextGenCredential extends Document {
  tenantId: mongoose.Types.ObjectId;
  sid: string;
  apiKey: string;
  active: boolean;
  createdAt: Date;
  rotatedAt?: Date;
}

const NextGenCredentialSchema = new Schema<INextGenCredential>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sid: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    rotatedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NextGenCredentialSchema.index({ tenantId: 1, sid: 1 });

export default mongoose.model<INextGenCredential>('NextGenCredential', NextGenCredentialSchema); 