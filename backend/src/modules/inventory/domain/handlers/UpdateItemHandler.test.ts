import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UpdateItemHandler } from './UpdateItemHandler';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('UpdateItemHandler', () => {
  const handler = new UpdateItemHandler();
  let defaultCategory: any;
  let defaultSubcategory: any;
  let unitPieces: any;
  let unitMeters: any;
  let baseItem: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    unitPieces = await Unit.create({
      name: 'Pieza',
      symbol: 'pz',
      allowsDecimals: false,
    });

    unitMeters = await Unit.create({
      name: 'Metro',
      symbol: 'm',
      allowsDecimals: true,
    });

    defaultCategory = await Category.create({ name: 'Perfiles' });
    defaultSubcategory = await Subcategory.create({
      name: 'Tubos',
      category: defaultCategory._id,
      unit: unitPieces._id,
      kind: 'material',
    });

    baseItem = await InventoryItem.create({
      name: 'Tubo Redondo 1 pulg',
      description: 'Acero galvanizado',
      subcategory: defaultSubcategory._id,
      kind: 'material',
      stock: 10,
      avgUnitCost: 25.5,
      isActive: true,
    });
  });

  it('updates basic item fields like name, description and isActive', async () => {
    const request: any = {
      targetId: baseItem._id,
      payload: {
        name: 'Tubo Redondo 1 pulg Calibre 18',
        description: 'Actualizado con calibre',
        isActive: false,
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const updated = await handler.apply(request, {}, ctx, undefined);

    expect(updated.name).toBe('Tubo Redondo 1 pulg Calibre 18');
    expect(updated.description).toBe('Actualizado con calibre');
    expect(updated.isActive).toBe(false);
    // Stock and avgUnitCost should remain unaffected
    expect(Number(updated.stock)).toBe(10);
    expect(Number(updated.avgUnitCost)).toBe(25.5);
  });

  it('updates pieceSpec when valid dimensional unit is supplied', async () => {
    const request: any = {
      targetId: baseItem._id,
      payload: {
        pieceSpec: {
          pieceSize: 6,
          measureUnit: unitMeters._id,
          minUsableMeasure: 0.5,
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const updated = await handler.apply(request, {}, ctx, undefined);

    expect(updated.pieceSpec).toBeDefined();
    expect(Number(updated.pieceSpec.pieceSize)).toBe(6);
    expect(Number(updated.pieceSpec.minUsableMeasure)).toBe(0.5);
    expect(updated.pieceSpec.measureUnit.toString()).toBe(unitMeters._id.toString());
  });

  it('throws an error if pieceSpec is applied with an indivisible unit using decimals', async () => {
    const request: any = {
      targetId: baseItem._id,
      payload: {
        pieceSpec: {
          pieceSize: 6.5,
          measureUnit: unitPieces._id, // unitPieces does NOT allow decimals
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'Unit "Pieza" does not allow decimals'
    );
  });

  it('throws an error if pieceSpec is supplied when item kind is tool', async () => {
    const request: any = {
      targetId: baseItem._id,
      payload: {
        kind: 'tool',
        pieceSpec: {
          pieceSize: 6,
          measureUnit: unitMeters._id,
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'pieceSpec is only allowed for materials'
    );
  });

  it('clears pieceSpec if pieceSpec is set to null', async () => {
    // First give it a pieceSpec
    baseItem.pieceSpec = {
      pieceSize: 6,
      measureUnit: unitMeters._id,
      minUsableMeasure: 0.5,
    };
    await baseItem.save();

    const request: any = {
      targetId: baseItem._id,
      payload: {
        pieceSpec: null,
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const updated = await handler.apply(request, {}, ctx, undefined);
    expect(updated.pieceSpec).toBeUndefined();
  });

  it('throws error if target item does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const request: any = {
      targetId: fakeId,
      payload: { name: 'Inexistente' },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow('Inventory item not found');
  });

  it('adjusts stock down and creates an adjustment InventoryMovement', async () => {
    const actorId = new mongoose.Types.ObjectId().toString();
    const request: any = {
      targetId: baseItem._id,
      payload: {
        stock: 3, // was 10, reduced to 3
        adjustmentReason: 'Error de digitación inicial',
      },
    };

    const ctx: any = { actorId, role: 'admin' };
    const updated = await handler.apply(request, {}, ctx, undefined);

    expect(Number(updated.stock)).toBe(3);

    const movement = await InventoryMovement.findOne({ item: baseItem._id, type: 'adjustment' });
    expect(movement).toBeDefined();
    expect(Number(movement?.quantity)).toBe(7); // 10 - 3 = 7
    expect(movement?.note).toBe('Error de digitación inicial');
  });

  it('discards available remnants when clearRemnants is true', async () => {
    const actorId = new mongoose.Types.ObjectId().toString();
    const remnant1 = await Remnant.create({
      item: baseItem._id,
      measure: 2.5,
      costPerMeasureSnapshot: 10,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });
    const remnant2 = await Remnant.create({
      item: baseItem._id,
      measure: 1.0,
      costPerMeasureSnapshot: 10,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      targetId: baseItem._id,
      payload: {
        stock: 0,
        clearRemnants: true,
        adjustmentReason: 'Vaciado total de inventario',
      },
    };

    const ctx: any = { actorId, role: 'admin' };
    const updated = await handler.apply(request, {}, ctx, undefined);

    expect(Number(updated.stock)).toBe(0);

    const rem1 = await Remnant.findById(remnant1._id);
    const rem2 = await Remnant.findById(remnant2._id);
    expect(rem1?.status).toBe('discarded');
    expect(rem2?.status).toBe('discarded');

    const wasteMovements = await InventoryMovement.find({ item: baseItem._id, type: 'waste' });
    expect(wasteMovements.length).toBe(2);
  });

  it('throws error when new stock is negative', async () => {
    const request: any = {
      targetId: baseItem._id,
      payload: {
        stock: -1,
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow('El stock no puede ser negativo');
  });
});
