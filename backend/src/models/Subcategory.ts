import { Schema, model, Document, Types } from 'mongoose';

export interface ISubcategory extends Document {
  category: Types.ObjectId;
  name: string;
  unit: Types.ObjectId;
  kind: 'material' | 'tool';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subcategorySchema = new Schema<ISubcategory>(
  {
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    kind: { type: String, enum: ['material', 'tool'], default: 'material' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subcategorySchema.index({ category: 1, name: 1 }, { unique: true });

export const Subcategory = model<ISubcategory>('Subcategory', subcategorySchema);
