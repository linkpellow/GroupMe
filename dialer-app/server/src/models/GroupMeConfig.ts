import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMeConfig extends Document {
  userId: string;
  accessToken: string;
  groups: Record<string, string>; // { groupId: groupName }
  createdAt: Date;
  updatedAt: Date;
}

const GroupMeConfigSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    groups: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IGroupMeConfig>('GroupMeConfig', GroupMeConfigSchema);
