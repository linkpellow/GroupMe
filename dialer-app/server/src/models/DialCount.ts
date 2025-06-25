import mongoose, { Document, Schema } from 'mongoose';

export interface IDialCount extends Document {
  phone: string; // 10-digit normalised phone
  userId: mongoose.Types.ObjectId;
  count: number;
  lastDialedAt: Date;
}

const dialCountSchema = new Schema<IDialCount>(
  {
    phone: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, default: 0 },
    lastDialedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure one doc per user+phone
// Using compound index with uniqueness
// We keep phone as digits-only string to reduce index size
// Name the index for clarity in Atlas/Compass

dialCountSchema.index({ userId: 1, phone: 1 }, { unique: true, name: 'user_phone_unique' });

dialCountSchema.index({ userId: 1, count: -1 }); // quick leaderboard per user if needed

type DialCountModelType = mongoose.Model<IDialCount>;

const DialCountModel: DialCountModelType = mongoose.model<IDialCount>('DialCount', dialCountSchema);
export default DialCountModel; 