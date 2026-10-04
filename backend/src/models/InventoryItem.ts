import { Schema, model, Document, Types } from 'mongoose';

export interface IInventoryItem extends Document {
  subcategory: Types.ObjectId;
  name: string;
  description: string;
  kind: 'material' | 'tool';
  stock: Types.Decimal128;
  avgUnitCost: Types.Decimal128;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    kind: { type: String, enum: ['material', 'tool'], required: true },
    stock: { type: Schema.Types.Decimal128, default: 0 },
    avgUnitCost: { type: Schema.Types.Decimal128, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ subcategory: 1 });

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
