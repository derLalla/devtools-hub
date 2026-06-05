import { Schema, model, Document, Types } from 'mongoose';

export interface ILink extends Document {
  _id: Types.ObjectId;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  category?: string;
  sortOrder: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const linkSchema = new Schema<ILink>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    description: { type: String, trim: true, maxlength: 1000 },
    icon: { type: String, trim: true, maxlength: 512 },
    category: { type: String, trim: true, maxlength: 100 },
    sortOrder: { type: Number, default: 0, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

linkSchema.index({ sortOrder: 1, title: 1 });

export const Link = model<ILink>('Link', linkSchema);
