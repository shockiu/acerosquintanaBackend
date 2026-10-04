import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkItem {
  item: Types.ObjectId;
  kind: 'material' | 'tool';
  quantity: Types.Decimal128;
  unitCostSnapshot?: Types.Decimal128;
  subtotal?: Types.Decimal128;
}

export interface IWork extends Document {
  clientName: string;
  description: string;
  performedAt: Date;
  chargedPrice?: Types.Decimal128;
  status: 'pending_approval' | 'approved' | 'rejected';
  items: IWorkItem[];
  materialsCost?: Types.Decimal128;
  profit?: Types.Decimal128;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workItemSchema = new Schema<IWorkItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    kind: { type: String, enum: ['material', 'tool'], required: true },
    quantity: { type: Schema.Types.Decimal128, required: true },
    unitCostSnapshot: { type: Schema.Types.Decimal128 },
    subtotal: { type: Schema.Types.Decimal128 },
  },
  { _id: false }
);

const workSchema = new Schema<IWork>(
  {
    clientName: { type: String, required: true },
    description: { type: String, default: '' },
    performedAt: { type: Date, required: true },
    chargedPrice: { type: Schema.Types.Decimal128 },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      required: true,
    },
    items: { type: [workItemSchema], default: [] },
    materialsCost: { type: Schema.Types.Decimal128 },
    profit: { type: Schema.Types.Decimal128 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

workSchema.index({ performedAt: -1 });

export const Work = model<IWork>('Work', workSchema);
