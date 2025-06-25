import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  phoneNumber: string;
  message: string;
  templateId?: Types.ObjectId;
  scheduledTime?: Date;
  status: 'pending' | 'sent' | 'failed';
  twilioMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phoneNumber: { type: String, required: true },
    message: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    scheduledTime: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    twilioMessageId: { type: String },
  },
  {
    timestamps: true,
  }
);

export default model<IMessage>('Message', messageSchema);
