import mongoose, { Document, Schema } from 'mongoose';

export interface ISourceCodeQuality extends Document {
  userId: mongoose.Types.ObjectId;
  sourceCode: string;
  quality: 'quality' | 'low-quality';
  autoAssigned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sourceCodeQualitySchema = new Schema<ISourceCodeQuality>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    sourceCode: { 
      type: String, 
      required: true, 
      trim: true,
      index: true 
    },
    quality: { 
      type: String, 
      enum: ['quality', 'low-quality'], 
      required: true 
    },
    autoAssigned: {
      type: Boolean,
      default: false
    },
  },
  { 
    timestamps: true,
    collection: 'sourcecodequalities'
  }
);

// Create compound unique index to prevent duplicate quality assignments
sourceCodeQualitySchema.index({ userId: 1, sourceCode: 1 }, { unique: true });

// Index for efficient filtering queries
sourceCodeQualitySchema.index({ userId: 1, quality: 1 });

const SourceCodeQualityModel = mongoose.model<ISourceCodeQuality>('SourceCodeQuality', sourceCodeQualitySchema);

export default SourceCodeQualityModel; 