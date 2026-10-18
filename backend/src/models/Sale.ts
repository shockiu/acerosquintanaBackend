import { Schema, model, Document, Types } from 'mongoose';

export interface ISaleItem {
  item: Types.ObjectId;
  name: string;
  kind: 'material' | 'tool';
  unitSymbol?: string;
  quantity: Types.Decimal128;
  unitCostSnapshot: Types.Decimal128;
  unitPrice: Types.Decimal128;
  subtotalCost: Types.Decimal128;
  subtotalPrice: Types.Decimal128;
  profit: Types.Decimal128;
}

export interface ISale extends Document {
  folio?: string;
  buyerName: string;
  performedAt: Date;
  items: ISaleItem[];
  totalAmount: Types.Decimal128;
  totalCost: Types.Decimal128;
  profit: Types.Decimal128;
  profitMargin?: Types.Decimal128;
  notes?: string;
  status: 'completed' | 'cancelled';
  registeredBy: Types.ObjectId;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    name: { type: String, required: true },
    kind: { type: String, enum: ['material', 'tool'], required: true },
    unitSymbol: { type: String, default: 'unid.' },
    quantity: { type: Schema.Types.Decimal128, required: true },
    unitCostSnapshot: { type: Schema.Types.Decimal128, required: true, default: 0 },
    unitPrice: { type: Schema.Types.Decimal128, required: true, default: 0 },
    subtotalCost: { type: Schema.Types.Decimal128, required: true, default: 0 },
    subtotalPrice: { type: Schema.Types.Decimal128, required: true, default: 0 },
    profit: { type: Schema.Types.Decimal128, required: true, default: 0 },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    folio: { type: String, index: true },
    buyerName: { type: String, required: true, trim: true },
    performedAt: { type: Date, required: true, default: Date.now },
    items: { type: [saleItemSchema], required: true },
    totalAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    totalCost: { type: Schema.Types.Decimal128, required: true, default: 0 },
    profit: { type: Schema.Types.Decimal128, required: true, default: 0 },
    profitMargin: { type: Schema.Types.Decimal128, default: 0 },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed',
      index: true,
    },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

saleSchema.index({ performedAt: -1 });
saleSchema.index({ buyerName: 'text', notes: 'text' });

export const Sale = model<ISale>('Sale', saleSchema);
