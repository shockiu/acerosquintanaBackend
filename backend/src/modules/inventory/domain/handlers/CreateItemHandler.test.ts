import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CreateItemHandler } from './CreateItemHandler';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('CreateItemHandler', () => {
  const handler = new CreateItemHandler();
  let defaultCategory: any;
  let defaultSubcategory: any;
  let unitPieces: any;
  let unitMeters: any;

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
    });
  });

  it('creates an item without pieceSpec with initial stock=0 and avgUnitCost=0', async () => {
    const request: any = {
      payload: {
        name: 'Tornillo 1/2',
        kind: 'material',
        category: defaultCategory._id,
        subcategory: defaultSubcategory._id,
        unit: unitPieces._id,
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const result = await handler.apply(request, {}, ctx, undefined);

    expect(result.name).toBe('Tornillo 1/2');
    expect(Number(result.stock.toString())).toBe(0);
    expect(result.avgUnitCost.toString()).toBe('0');
  });

  it('creates an item with valid pieceSpec when measureUnit allows decimals', async () => {
    const request: any = {
      payload: {
        name: 'Tubo Estructural 6m',
        kind: 'material',
        category: defaultCategory._id,
        subcategory: defaultSubcategory._id,
        unit: unitPieces._id,
        pieceSpec: {
          pieceSize: 6.0,
          measureUnit: unitMeters._id,
          minUsableMeasure: 0.5,
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const result = await handler.apply(request, {}, ctx, undefined);

    expect(result.name).toBe('Tubo Estructural 6m');
    expect(Number(result.pieceSpec.pieceSize.toString())).toBe(6.0);
    expect(Number(result.pieceSpec.minUsableMeasure.toString())).toBe(0.5);
  });

  it('throws an error if pieceSpec.measureUnit does not exist', async () => {
    const fakeUnitId = new mongoose.Types.ObjectId();
    const request: any = {
      payload: {
        name: 'Invalid Unit Item',
        kind: 'material',
        category: defaultCategory._id,
        subcategory: defaultSubcategory._id,
        unit: unitPieces._id,
        pieceSpec: {
          pieceSize: 6,
          measureUnit: fakeUnitId,
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'pieceSpec.measureUnit does not exist'
    );
  });

  it('throws an error if pieceSpec has decimals but unit does not allow decimals', async () => {
    const request: any = {
      payload: {
        name: 'Invalid Decimal Item',
        kind: 'material',
        category: defaultCategory._id,
        subcategory: defaultSubcategory._id,
        unit: unitPieces._id,
        pieceSpec: {
          pieceSize: 5.5,
          measureUnit: unitPieces._id, // Pieza does not allow decimals
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'does not allow decimals'
    );
  });

  it('throws an error if minUsableMeasure has decimals when unit does not allow decimals', async () => {
    const request: any = {
      payload: {
        name: 'Invalid Decimal Min Item',
        kind: 'material',
        category: defaultCategory._id,
        subcategory: defaultSubcategory._id,
        unit: unitPieces._id,
        pieceSpec: {
          pieceSize: 6,
          minUsableMeasure: 1.5,
          measureUnit: unitPieces._id,
        },
      },
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'does not allow decimals'
    );
  });
});
