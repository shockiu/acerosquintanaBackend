import { Schema, model, Document, Types } from 'mongoose';

export interface IRemnant extends Document {
  item: Types.ObjectId;
  measure: Types.Decimal128;
  costPerMeasureSnapshot: Types.Decimal128;
  status: 'available' | 'used' | 'discarded';
  originWork?: Types.ObjectId;
  parentRemnant?: Types.ObjectId;
  usedInWork?: Types.ObjectId;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Remnants are immutable in measure: cutting one marks it 'used' and, if
// something is left over, a child remnant is created via parentRemnant.
const remnantSchema = new Schema<IRemnant>(
  {
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    measure: { type: Schema.Types.Decimal128, required: true },
    costPerMeasureSnapshot: { type: Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['available', 'used', 'discarded'],
      default: 'available',
      required: true,
    },
    originWork: { type: Schema.Types.ObjectId, ref: 'Work' },
    parentRemnant: { type: Schema.Types.ObjectId, ref: 'Remnant' },
    usedInWork: { type: Schema.Types.ObjectId, ref: 'Work' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

remnantSchema.index({ item: 1, status: 1 });
remnantSchema.index({ originWork: 1 });

export const Remnant = model<IRemnant>('Remnant', remnantSchema);
