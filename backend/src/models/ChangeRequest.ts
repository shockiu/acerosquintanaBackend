import { Schema, model, Document, Types } from 'mongoose';

export interface IChangeRequest extends Document {
  entity: 'inventoryItem' | 'inventoryMovement' | 'work' | 'remnant' | 'category' | 'subcategory' | 'sale';
  action: 'create' | 'update' | 'delete' | 'purchase' | 'discard' | 'cancel';
  targetId?: Types.ObjectId;
  targetName?: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const changeRequestSchema = new Schema<IChangeRequest>(
  {
    entity: {
      type: String,
      enum: ['inventoryItem', 'inventoryMovement', 'work', 'remnant', 'category', 'subcategory', 'sale'],
      required: true,
    },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'purchase', 'discard', 'cancel'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId }, // Nullable for create
    targetName: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

changeRequestSchema.index({ status: 1, createdAt: -1 });

export const ChangeRequest = model<IChangeRequest>('ChangeRequest', changeRequestSchema);
