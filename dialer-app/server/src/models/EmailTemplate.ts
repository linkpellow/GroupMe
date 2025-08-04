import { Schema, model, Document, Types } from 'mongoose';

export interface IEmailTemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  subject: string;
  body: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

// Create index for quicker lookups
emailTemplateSchema.index({ userId: 1 });

export default model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
