import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DiscardRemnantHandler } from './DiscardRemnantHandler';
import { Remnant } from '../../../../models/Remnant';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('DiscardRemnantHandler', () => {
  const handler = new DiscardRemnantHandler();
  let item: any;
  let unit: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    unit = await Unit.create({ name: 'Metro', symbol: 'm', allowsDecimals: true });
    const category = await Category.create({ name: 'Perfiles' });
    const subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unit._id });

    item = await InventoryItem.create({
      name: 'Tubo 6m',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unit._id,
      stock: 10,
      avgUnitCost: '60.00',
    });
  });

  it('marks an available remnant as discarded and creates waste movement', async () => {
    const remnant = await Remnant.create({
      item: item._id,
      measure: 2.5,
      unit: unit._id,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      targetId: remnant._id.toString(),
      payload: { note: 'Retazo oxidado' },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const result = await handler.apply(request, {}, ctx, undefined);

    expect(result.status).toBe('discarded');
    expect(result.approvedBy?.toString()).toBe(ctx.actorId);

    const updated = await Remnant.findById(remnant._id);
    expect(updated?.status).toBe('discarded');

    const movement = await InventoryMovement.findOne({ remnant: remnant._id });
    expect(movement).toBeDefined();
    expect(movement?.type).toBe('waste');
    expect(movement?.measureUsed?.toString()).toBe('2.5');
    // totalCost = 2.5 * 10 = 25
    expect(movement?.totalCost?.toString()).toBe('25');
  });

  it('throws an error if remnant is not found or not in available status', async () => {
    const remnantUsed = await Remnant.create({
      item: item._id,
      measure: 1.5,
      unit: unit._id,
      costPerMeasureSnapshot: 10.0,
      status: 'used',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      targetId: remnantUsed._id.toString(),
      payload: {},
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'El retazo no fue encontrado o no está disponible para descarte'
    );
  });
});
