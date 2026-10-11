import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PurchaseHandler } from './PurchaseHandler';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('PurchaseHandler', () => {
  const handler = new PurchaseHandler();
  let testItem: any;
  let unit: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    unit = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    const category = await Category.create({ name: 'Perfiles' });
    const subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unit._id });

    testItem = await InventoryItem.create({
      name: 'Tubo 2"',
      category: category._id,
      subcategory: subcategory._id,
      unit: unit._id,
      stock: 10,
      avgUnitCost: '20.00',
      kind: 'material',
    });
  });

  it('updates stock and weighted average cost with unitCost', async () => {
    // Current: 10 @ $20 = $200. Purchase 10 @ $30 = $300. Total 20 @ $25 = $500.
    const request: any = {
      targetId: testItem._id.toString(),
      payload: {
        quantity: 10,
        unitCost: 30,
        note: 'Compra de tubos',
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const movement = await handler.apply(request, {}, ctx, undefined);

    expect(movement.type).toBe('purchase');
    expect(movement.quantity.toString()).toBe('10');
    expect(movement.unitCost.toString()).toBe('30');
    expect(movement.totalCost.toString()).toBe('300');

    const updatedItem = await InventoryItem.findById(testItem._id);
    expect(Number(updatedItem?.stock.toString())).toBe(20);
    expect(updatedItem?.avgUnitCost.toString()).toBe('25');
  });

  it('supports totalCost calculation when unitCost is not provided', async () => {
    // Current: 10 @ $20 = $200. Purchase 5 for total $200 (unit = $40). Total 15 @ $26.66666...
    const request: any = {
      targetId: testItem._id.toString(),
      payload: {
        quantity: 5,
        totalCost: 200,
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const movement = await handler.apply(request, {}, ctx, undefined);

    expect(movement.unitCost.toString()).toBe('40');
    expect(movement.totalCost.toString()).toBe('200');

    const updatedItem = await InventoryItem.findById(testItem._id);
    expect(Number(updatedItem?.stock.toString())).toBe(15);
  });

  it('allows admin overrides on cost during approval', async () => {
    const request: any = {
      targetId: testItem._id.toString(),
      payload: {
        quantity: 5,
        unitCost: 10, // original requested
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const overrides = { unitCost: 15 }; // admin override
    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const movement = await handler.apply(request, overrides, ctx, undefined);

    expect(movement.unitCost.toString()).toBe('15');
    expect(movement.totalCost.toString()).toBe('75');

    // Admin overrides with totalCost on request without unitCost
    const requestNoUnitCost: any = {
      targetId: testItem._id.toString(),
      payload: {
        quantity: 5,
        totalCost: 40,
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };
    const movementTotalCostOverride = await handler.apply(requestNoUnitCost, { totalCost: 100 }, ctx, undefined);
    expect(movementTotalCostOverride.totalCost.toString()).toBe('100');
    expect(movementTotalCostOverride.unitCost.toString()).toBe('20');
  });

  it('updates stock for tool purchase without changing avgUnitCost', async () => {
    const tool = await InventoryItem.create({
      name: 'Amoladora',
      category: testItem.category,
      subcategory: testItem.subcategory,
      unit: unit._id,
      stock: 2,
      avgUnitCost: '80.00',
      kind: 'tool',
    });

    const request: any = {
      targetId: tool._id.toString(),
      payload: {
        quantity: 3,
        unitCost: 100,
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const movement = await handler.apply(request, {}, ctx, undefined);

    expect(movement.type).toBe('purchase');
    const updatedTool = await InventoryItem.findById(tool._id);
    expect(Number(updatedTool?.stock.toString())).toBe(5);
    expect(Number(updatedTool?.avgUnitCost.toString())).toBe(80);
  });

  it('throws an error if neither unitCost nor totalCost is provided', async () => {
    const request: any = {
      targetId: testItem._id.toString(),
      payload: { quantity: 5 },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow(
      'Purchase must have either unitCost or totalCost'
    );
  });

  it('throws an error if item is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const request: any = {
      targetId: fakeId,
      payload: { quantity: 5, unitCost: 10 },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow('Item not found');
  });
});
