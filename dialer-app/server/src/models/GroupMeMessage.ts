import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMeMessage extends Document {
  groupId: string;
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  avatarUrl: string;
  createdAt: Date;
  attachments: any[];
}

const GroupMeMessageSchema: Schema = new Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    text: {
      type: String,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    attachments: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index for efficient queries
GroupMeMessageSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model<IGroupMeMessage>('GroupMeMessage', GroupMeMessageSchema);
