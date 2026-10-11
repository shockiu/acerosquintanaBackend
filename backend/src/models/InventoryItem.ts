import { Schema, model, Document, Types } from 'mongoose';

export interface IPieceSpec {
  pieceSize: Types.Decimal128;
  measureUnit: Types.ObjectId;
  minUsableMeasure?: Types.Decimal128;
}

export interface IInventoryItem extends Document {
  subcategory: Types.ObjectId;
  name: string;
  description: string;
  kind: 'material' | 'tool';
  stock: Types.Decimal128;
  avgUnitCost: Types.Decimal128;
  pieceSpec?: IPieceSpec | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pieceSpecSchema = new Schema<IPieceSpec>(
  {
    pieceSize: { type: Schema.Types.Decimal128, required: true },
    measureUnit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    minUsableMeasure: { type: Schema.Types.Decimal128 },
  },
  { _id: false }
);

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    kind: { type: String, enum: ['material', 'tool'], required: true },
    stock: { type: Schema.Types.Decimal128, default: 0 },
    avgUnitCost: { type: Schema.Types.Decimal128, default: 0 },
    // Optional: when absent the item is tracked only by stock in its own unit.
    pieceSpec: { type: pieceSpecSchema, default: undefined },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ subcategory: 1 });

export const InventoryItem = model<IInventoryItem>('InventoryItem', inventoryItemSchema);
