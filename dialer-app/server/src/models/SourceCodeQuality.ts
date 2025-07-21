import mongoose, { Document, Schema } from 'mongoose';

export interface ISourceCodeQuality extends Document {
  sourceCode: string;
  quality: 'Quality' | 'Low Quality';
  autoFlagged: boolean;
  manualOverride: boolean;
  lastUpdated: Date;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sourceCodeQualitySchema = new Schema<ISourceCodeQuality>(
  {
    sourceCode: {
      type: String,
      required: true,
      index: true,
    },
    quality: {
      type: String,
      enum: ['Quality', 'Low Quality'],
      default: 'Low Quality',
      required: true,
    },
    autoFlagged: {
      type: Boolean,
      default: false,
    },
    manualOverride: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique source code per tenant
sourceCodeQualitySchema.index({ sourceCode: 1, tenantId: 1 }, { unique: true });

// Static method to update quality flag
sourceCodeQualitySchema.statics.updateQuality = async function(
  sourceCode: string,
  tenantId: mongoose.Types.ObjectId,
  quality: 'Quality' | 'Low Quality',
  isAuto: boolean = false
): Promise<ISourceCodeQuality> {
  const update = {
    quality,
    autoFlagged: isAuto,
    manualOverride: !isAuto,
    lastUpdated: new Date(),
  };

  const doc = await this.findOneAndUpdate(
    { sourceCode, tenantId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return doc;
};

// Instance method to check if manually overridden
sourceCodeQualitySchema.methods.isManuallyOverridden = function(): boolean {
  return this.manualOverride === true;
};

const SourceCodeQualityModel = mongoose.model<ISourceCodeQuality>(
  'SourceCodeQuality',
  sourceCodeQualitySchema
);

export default SourceCodeQualityModel; 