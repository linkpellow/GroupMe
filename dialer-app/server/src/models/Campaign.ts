import { Schema, model, Document, Types } from 'mongoose';

export interface ICampaignStep {
  templateId: string;
  delayDays: number;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  messageIds?: string[]; // Gmail message IDs for tracking
  error?: string;
}

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  steps: ICampaignStep[];
  startDate: Date;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'draft';
  recipients: string[]; // Array of lead IDs
  recipientCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastProcessed?: Date;
}

const campaignStepSchema = new Schema(
  {
    templateId: { type: String, required: true },
    delayDays: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    sentAt: { type: Date },
    messageIds: [{ type: String }], // Store Gmail message IDs
    error: { type: String },
  },
  { _id: false }
);

const campaignSchema = new Schema<ICampaign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    steps: [campaignStepSchema],
    startDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'paused', 'draft'],
      default: 'scheduled',
    },
    recipients: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
    recipientCount: { type: Number, default: 0 },
    lastProcessed: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient queries
campaignSchema.index({ userId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ startDate: 1 });

export default model<ICampaign>('Campaign', campaignSchema);
