import { Schema, model, Document } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  symbol: string;
  allowsDecimals: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    name: { type: String, required: true, unique: true },
    symbol: { type: String, required: true },
    allowsDecimals: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export const Unit = model<IUnit>('Unit', unitSchema);
