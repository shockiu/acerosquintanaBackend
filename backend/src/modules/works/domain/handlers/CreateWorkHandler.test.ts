import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CreateWorkHandler } from './CreateWorkHandler';
import { Work } from '../../../../models/Work';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('CreateWorkHandler', () => {
  const handler = new CreateWorkHandler();
  let unitPieces: any;
  let unitMeters: any;
  let category: any;
  let subcategory: any;
  let pipeItem: any;
  let legacyItem: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    unitPieces = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    unitMeters = await Unit.create({ name: 'Metro', symbol: 'm', allowsDecimals: true });

    category = await Category.create({ name: 'Perfiles' });
    subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unitPieces._id });

    // Item with pieceSpec: 6m pipes, cost $60/piece ($10/m)
    pipeItem = await InventoryItem.create({
      name: 'Tubo 6m',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 10,
      avgUnitCost: '60.00',
      kind: 'material',
      pieceSpec: {
        pieceSize: 6.0,
        measureUnit: unitMeters._id,
        minUsableMeasure: 0.5,
      },
    });

    // Item without pieceSpec: screws
    legacyItem = await InventoryItem.create({
      name: 'Tornillo',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 100,
      avgUnitCost: '0.50',
      kind: 'material',
    });
  });

  it('handles whole pieces consumption and calculates profit correctly', async () => {
    const request: any = {
      payload: {
        clientName: 'Cliente A',
        performedAt: new Date().toISOString(),
        chargedPrice: 200,
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'pieces',
            quantity: 2,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.status).toBe('approved');
    expect(work.materialsCost?.toString()).toBe('120'); // 2 * $60
    // profit = 200 - 120 = 80
    expect(work.profit?.toString()).toBe('80');

    const updatedPipe = await InventoryItem.findById(pipeItem._id);
    expect(Number(updatedPipe?.stock.toString())).toBe(8); // 10 - 2
  });

  it('handles cut consumption from whole piece and creates a remnant', async () => {
    // Cut 2.5m from 6m pipe. Consumes 1 pipe, creates 3.5m remnant. Material cost = 2.5 * $10 = $25.
    const request: any = {
      payload: {
        clientName: 'Cliente B',
        performedAt: new Date().toISOString(),
        chargedPrice: 50,
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'measure',
            source: 'whole_piece',
            measureUsed: 2.5,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.materialsCost?.toString()).toBe('25');
    expect(work.profit?.toString()).toBe('25'); // 50 - 25

    // Stock was 10 -> consumed 1 whole piece -> now 9
    const updatedPipe = await InventoryItem.findById(pipeItem._id);
    expect(Number(updatedPipe?.stock.toString())).toBe(9);

    // Remnant was created: 3.5m
    const remnant = await Remnant.findOne({ item: pipeItem._id });
    expect(remnant).toBeDefined();
    expect(remnant?.measure?.toString()).toBe('3.5');
    expect(remnant?.status).toBe('available');
    expect(remnant?.costPerMeasureSnapshot?.toString()).toBe('10');
  });

  it('handles cut consumption from an existing remnant', async () => {
    const parentRemnant = await Remnant.create({
      item: pipeItem._id,
      measure: 4.0,
      unit: unitMeters._id,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Use 1.5m from 4.0m remnant -> generates a 2.5m remainder remnant
    const request: any = {
      payload: {
        clientName: 'Cliente C',
        performedAt: new Date().toISOString(),
        chargedPrice: 30,
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'measure',
            source: 'remnant',
            remnant: parentRemnant._id.toString(),
            measureUsed: 1.5,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.materialsCost?.toString()).toBe('15'); // 1.5 * $10
    expect(work.profit?.toString()).toBe('15'); // 30 - 15

    // Parent remnant is marked 'used'
    const updatedParent = await Remnant.findById(parentRemnant._id);
    expect(updatedParent?.status).toBe('used');

    // New remnant created: 2.5m
    const newRemnant = await Remnant.findOne({ parentRemnant: parentRemnant._id });
    expect(newRemnant).toBeDefined();
    expect(newRemnant?.measure?.toString()).toBe('2.5');
    expect(newRemnant?.status).toBe('available');
  });

  it('updates existing pending work instead of duplicating when request.targetId is provided', async () => {
    const existingWork = await Work.create({
      clientName: 'Cliente Existente',
      performedAt: new Date(),
      status: 'pending_approval',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      targetId: existingWork._id.toString(),
      payload: {
        clientName: 'Cliente Modificado',
        performedAt: new Date().toISOString(),
        chargedPrice: 100,
        items: [
          {
            item: legacyItem._id.toString(),
            quantity: 10,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const result = await handler.apply(request, {}, ctx, undefined);

    expect(result._id.toString()).toBe(existingWork._id.toString());
    expect(result.status).toBe('approved');
    expect(result.clientName).toBe('Cliente Modificado');

    const totalWorks = await Work.countDocuments();
    expect(totalWorks).toBe(1); // No duplicate was created!
  });

  it('throws an error if item stock is insufficient for pieces consumption', async () => {
    const request: any = {
      payload: {
        clientName: 'Cliente Stock Insuficiente',
        performedAt: new Date().toISOString(),
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'pieces',
            quantity: 999, // Stock is only 10!
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow('Stock insuficiente');
  });

  it('handles manual waste mode on a remnant inside a work', async () => {
    const remnant = await Remnant.create({
      item: pipeItem._id,
      measure: 2.0,
      unit: unitMeters._id,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      payload: {
        clientName: 'Cliente Con Merma',
        performedAt: new Date().toISOString(),
        chargedPrice: 100,
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'waste',
            remnant: remnant._id.toString(),
            note: 'Dañado durante transporte en obra',
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.status).toBe('approved');
    expect(work.waste).toHaveLength(1);
    expect(work.wasteCost?.toString()).toBe('20'); // 2.0 * $10

    const updatedRemnant = await Remnant.findById(remnant._id);
    expect(updatedRemnant?.status).toBe('discarded');
  });

  it('discards remainder when cut leaves less than minUsableMeasure', async () => {
    // Cut 5.8m of 6m pipe. minUsableMeasure is 0.5m. Remaining 0.2m is below min, so discarded as waste.
    const request: any = {
      payload: {
        clientName: 'Cliente Merma Automatica',
        performedAt: new Date().toISOString(),
        chargedPrice: 70,
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'measure',
            source: 'whole_piece',
            measureUsed: 5.8,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    // No remnant created because 0.2m < 0.5m
    const remnants = await Remnant.find({ item: pipeItem._id });
    expect(remnants).toHaveLength(0);

    // Waste is registered
    expect(work.waste).toHaveLength(1);
    expect(work.wasteCost?.toString()).toBe('2'); // 0.2 * $10
  });

  it('generates waste when cutting from remnant leaves less than minUsableMeasure', async () => {
    const remnant = await Remnant.create({
      item: pipeItem._id,
      measure: 2.0,
      unit: unitMeters._id,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      payload: {
        clientName: 'Cliente Remnant Waste',
        performedAt: new Date().toISOString(),
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'measure',
            source: 'remnant',
            remnant: remnant._id.toString(),
            measureUsed: 1.8, // 2.0 - 1.8 = 0.2m < 0.5m -> waste!
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.waste).toHaveLength(1);
    expect(work.wasteCost?.toString()).toBe('2');
  });

  it('throws error when remnant in waste mode is unavailable', async () => {
    const remnant = await Remnant.create({
      item: pipeItem._id,
      measure: 2.0,
      unit: unitMeters._id,
      costPerMeasureSnapshot: 10.0,
      status: 'discarded',
      createdBy: new mongoose.Types.ObjectId(),
    });

    const request: any = {
      payload: {
        clientName: 'Cliente Error Descarte',
        performedAt: new Date().toISOString(),
        items: [
          {
            item: pipeItem._id.toString(),
            mode: 'waste',
            remnant: remnant._id.toString(),
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    await expect(handler.apply(request, {}, ctx, undefined)).rejects.toThrow('El retazo a descartar no está disponible');
  });

  it('handles tool item consumption in work without stock deduction', async () => {
    const tool = await InventoryItem.create({
      name: 'Soldadora',
      kind: 'tool',
      category: pipeItem.category,
      subcategory: pipeItem.subcategory,
      unit: unitMeters._id,
      stock: 3,
      avgUnitCost: '500',
    });

    const request: any = {
      payload: {
        clientName: 'Cliente Con Herramienta',
        performedAt: new Date().toISOString(),
        items: [
          {
            item: tool._id.toString(),
            quantity: 1,
          },
        ],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    };

    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };
    const work = await handler.apply(request, {}, ctx, undefined);

    expect(work.items[0].kind).toBe('tool');
    const updatedTool = await InventoryItem.findById(tool._id);
    expect(updatedTool?.stock.toString()).toBe('3');
  });

  describe('tool lines', () => {
    let tool: any;
    const ctx: any = { actorId: new mongoose.Types.ObjectId().toString(), role: 'admin' };

    beforeEach(async () => {
      tool = await InventoryItem.create({
        name: 'Esmeril',
        kind: 'tool',
        subcategory: subcategory._id,
        stock: 3,
        avgUnitCost: '100',
      });
    });

    const buildRequest = (line: any, chargedPrice?: number) => ({
      payload: {
        clientName: 'Cliente Tools',
        performedAt: new Date().toISOString(),
        chargedPrice,
        items: [{ item: tool._id.toString(), mode: 'tool', ...line }],
      },
      requestedBy: new mongoose.Types.ObjectId().toString(),
    });

    it('returned tool: no stock change, no movement, no loss cost', async () => {
      const work = await handler.apply(buildRequest({ quantity: 2, lostQuantity: 0 }, 500) as any, {}, ctx, undefined);

      expect((await InventoryItem.findById(tool._id))?.stock.toString()).toBe('3');
      expect(await InventoryMovement.countDocuments({ item: tool._id })).toBe(0);
      expect(work.toolLossCost?.toString()).toBe('0');
      expect(work.profit?.toString()).toBe('500');
      expect(work.items[0].mode).toBe('tool');
    });

    it('lost tool: writes off stock, records movement and reduces profit', async () => {
      const work = await handler.apply(
        buildRequest({ quantity: 2, lostQuantity: 1, lossReason: 'damaged', note: 'Se quemó el motor' }, 500) as any,
        {}, ctx, undefined,
      );

      expect((await InventoryItem.findById(tool._id))?.stock.toString()).toBe('2');
      const mov = await InventoryMovement.findOne({ item: tool._id, type: 'tool_writeoff' });
      expect(mov?.quantity.toString()).toBe('-1');
      expect(mov?.totalCost?.toString()).toBe('100');
      expect(work.toolLossCost?.toString()).toBe('100');
      expect(work.profit?.toString()).toBe('400');
      expect(work.items[0].lossReason).toBe('damaged');
      expect(work.items[0].lostQuantity?.toString()).toBe('1');
    });

    it('rejects using more tools than available stock', async () => {
      await expect(
        handler.apply(buildRequest({ quantity: 5, lostQuantity: 0 }) as any, {}, ctx, undefined),
      ).rejects.toThrow('Stock insuficiente de la herramienta');
    });
  });
});
