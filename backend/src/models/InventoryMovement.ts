import { Schema, model, Document, Types } from 'mongoose';

export interface IInventoryMovement extends Document {
  item: Types.ObjectId;
  type: 'purchase' | 'adjustment' | 'work_consumption' | 'work_reversal';
  quantity: Types.Decimal128;
  unitCost?: Types.Decimal128;
  totalCost?: Types.Decimal128;
  work?: Types.ObjectId;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    type: {
      type: String,
      enum: ['purchase', 'adjustment', 'work_consumption', 'work_reversal'],
      required: true,
    },
    quantity: { type: Schema.Types.Decimal128, required: true },
    unitCost: { type: Schema.Types.Decimal128 },
    totalCost: { type: Schema.Types.Decimal128 },
    work: { type: Schema.Types.ObjectId, ref: 'Work' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ item: 1 });

export const InventoryMovement = model<IInventoryMovement>('InventoryMovement', inventoryMovementSchema);
