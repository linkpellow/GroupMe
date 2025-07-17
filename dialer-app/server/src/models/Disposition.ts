import mongoose, { Document, Schema } from 'mongoose';

export interface IDispositionInput {
  name: string;
  color: string;
  isDefault: boolean;
  createdBy: mongoose.Types.ObjectId;
  sortOrder: number;
  emoji?: string;
}

export interface IDisposition extends IDispositionInput, Document {
  createdAt: Date;
  updatedAt: Date;
}

const dispositionSchema = new Schema<IDisposition>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    color: {
      type: String,
      required: true,
      default: '#FFFFFF',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    emoji: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for faster queries
dispositionSchema.index({ isDefault: 1 });
dispositionSchema.index({ createdBy: 1 });
dispositionSchema.index({ sortOrder: 1 });

const DispositionModel = mongoose.model<IDisposition>('Disposition', dispositionSchema);
export default DispositionModel;
