import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    content: { type: String, required: true },
    variables: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export default model<ITemplate>('Template', templateSchema);
