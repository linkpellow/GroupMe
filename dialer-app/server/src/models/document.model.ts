import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  clientId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  filePath: string;
  uploadDate: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  metadata?: {
    lastModified?: Date;
    uploadedBy?: string;
    description?: string;
  };
  // Methods
  softDelete(): Promise<IDocument>;
  restore(): Promise<IDocument>;
}

const documentSchema = new Schema<IDocument>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    fileType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      lastModified: Date,
      uploadedBy: String,
      description: String,
    },
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

// Indexes for performance
documentSchema.index({ clientId: 1, isDeleted: 1 });
documentSchema.index({ uploadDate: -1 });
documentSchema.index({ fileName: 1 });

// Virtual for returning formatted document data
documentSchema.virtual('formattedDocument').get(function () {
  return {
    _id: this._id,
    clientId: this.clientId,
    fileName: this.originalName,
    fileSize: this.fileSize,
    fileType: this.fileType,
    uploadDate: this.uploadDate.toISOString(),
    fileUrl: this.fileUrl,
  };
});

// Method to soft delete
documentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Method to restore
documentSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = undefined;
  return this.save();
};

const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);

export default DocumentModel;
