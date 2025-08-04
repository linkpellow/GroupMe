import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  twilioSid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  agent: mongoose.Types.ObjectId;
  lead?: mongoose.Types.ObjectId;
  duration: number;
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>(
  {
    twilioSid: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    duration: { type: Number, default: 0 },
    recordingUrl: { type: String },
  },
  { timestamps: true }
);

// Indexes for faster queries
callSchema.index({ agent: 1, createdAt: -1 });
callSchema.index({ lead: 1, createdAt: -1 });

const CallModel = mongoose.model<ICall>('Call', callSchema);
export default CallModel;
