import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkItem {
  item: Types.ObjectId;
  kind: 'material' | 'tool';
  // Only meaningful for items with pieceSpec. Absent => legacy quantity line.
  mode?: 'pieces' | 'measure' | 'waste' | 'tool';
  source?: 'whole_piece' | 'remnant';
  remnant?: Types.ObjectId;
  measureUsed?: Types.Decimal128;
  piecesConsumed?: Types.Decimal128;
  remnantsCreated?: Types.ObjectId[];
  // For measure lines this is not used; consumption is expressed in measureUsed.
  quantity?: Types.Decimal128;
  unitCostSnapshot?: Types.Decimal128;
  subtotal?: Types.Decimal128;
  // Tool lines only: units written off (damaged / end of life). Absent/0 => returned.
  lostQuantity?: Types.Decimal128;
  lossReason?: 'damaged' | 'end_of_life';
  note?: string;
}

export interface IWorkWaste {
  item: Types.ObjectId;
  subcategory: Types.ObjectId;
  measure: Types.Decimal128;
  measureUnit: Types.ObjectId;
  costPerMeasureSnapshot: Types.Decimal128;
  cost: Types.Decimal128;
  remnant?: Types.ObjectId;
  manual: boolean;
  note?: string;
}

export interface IWork extends Document {
  clientName: string;
  description: string;
  performedAt: Date;
  chargedPrice?: Types.Decimal128;
  status: 'pending_approval' | 'approved' | 'rejected';
  items: IWorkItem[];
  materialsCost?: Types.Decimal128;
  waste: IWorkWaste[];
  wasteCost?: Types.Decimal128;
  toolLossCost?: Types.Decimal128;
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
    mode: { type: String, enum: ['pieces', 'measure', 'waste', 'tool'] },
    source: { type: String, enum: ['whole_piece', 'remnant'] },
    remnant: { type: Schema.Types.ObjectId, ref: 'Remnant' },
    measureUsed: { type: Schema.Types.Decimal128 },
    piecesConsumed: { type: Schema.Types.Decimal128 },
    remnantsCreated: [{ type: Schema.Types.ObjectId, ref: 'Remnant' }],
    quantity: { type: Schema.Types.Decimal128 },
    unitCostSnapshot: { type: Schema.Types.Decimal128 },
    subtotal: { type: Schema.Types.Decimal128 },
    lostQuantity: { type: Schema.Types.Decimal128 },
    lossReason: { type: String, enum: ['damaged', 'end_of_life'] },
    note: { type: String },
  },
  { _id: false }
);

const workWasteSchema = new Schema<IWorkWaste>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'Subcategory', required: true },
    measure: { type: Schema.Types.Decimal128, required: true },
    measureUnit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    costPerMeasureSnapshot: { type: Schema.Types.Decimal128, required: true },
    cost: { type: Schema.Types.Decimal128, required: true },
    remnant: { type: Schema.Types.ObjectId, ref: 'Remnant' },
    manual: { type: Boolean, default: false },
    note: { type: String },
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
    waste: { type: [workWasteSchema], default: [] },
    wasteCost: { type: Schema.Types.Decimal128 },
    toolLossCost: { type: Schema.Types.Decimal128 },
    profit: { type: Schema.Types.Decimal128 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

workSchema.index({ performedAt: -1 });

export const Work = model<IWork>('Work', workSchema);
