import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ExportUseCases } from './ExportUseCases';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Work } from '../../../../models/Work';
import { Remnant } from '../../../../models/Remnant';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('ExportUseCases', () => {
  let unitPieces: any;
  let unitMeters: any;
  let category: any;
  let subcategory: any;
  let item: any;

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

    item = await InventoryItem.create({
      name: 'Tubo 6m Export',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 5,
      avgUnitCost: '50.00',
      pieceSpec: {
        pieceSize: 6.0,
        measureUnit: unitMeters._id,
        minUsableMeasure: 0.5,
      },
    });

    await Remnant.create({
      item: item._id,
      measure: 2.5,
      costPerMeasureSnapshot: 8.33,
      status: 'available',
      createdBy: new mongoose.Types.ObjectId(),
    });
  });

  it('exports inventory workbook for admin including financial columns', async () => {
    const ctx: any = { role: 'admin' };
    const workbook = await ExportUseCases.exportInventory(ctx);

    const inventorySheet = workbook.getWorksheet('Inventario');
    expect(inventorySheet).toBeDefined();
    expect(inventorySheet?.rowCount).toBeGreaterThanOrEqual(2); // Header + 1 row

    const remnantsSheet = workbook.getWorksheet('Retazos');
    expect(remnantsSheet).toBeDefined();
    expect(remnantsSheet?.rowCount).toBeGreaterThanOrEqual(2);
  });

  it('exports inventory workbook for user hiding financial columns', async () => {
    const ctx: any = { role: 'user' };
    const workbook = await ExportUseCases.exportInventory(ctx);

    const inventorySheet = workbook.getWorksheet('Inventario');
    expect(inventorySheet).toBeDefined();
    // Verify admin-only columns are not present
    const headers = inventorySheet?.getRow(1).values as string[];
    expect(headers).not.toContain('Costo Unit. Promedio');
    expect(headers).not.toContain('Valor Total Inventario');
  });

  it('exports works workbook with works and waste sheets', async () => {
    await Work.create({
      clientName: 'Cliente Excel',
      description: 'Barandas',
      performedAt: new Date(),
      status: 'approved',
      chargedPrice: '200',
      materialsCost: '100',
      wasteCost: '15',
      profit: '85',
      createdBy: new mongoose.Types.ObjectId(),
      waste: [
        {
          item: item._id,
          subcategory: subcategory._id,
          measure: 1.5,
          measureUnit: unitMeters._id,
          costPerMeasureSnapshot: 10,
          cost: 15,
          manual: true,
          note: 'Desperdicio manual',
        },
        {
          item: item._id,
          subcategory: subcategory._id,
          measure: 0.3,
          measureUnit: unitMeters._id,
          costPerMeasureSnapshot: 10,
          cost: 3,
          manual: false,
        },
      ],
    });

    const ctxAdmin: any = { role: 'admin' };
    const workbookAdmin = await ExportUseCases.exportWorks(ctxAdmin);
    const worksSheet = workbookAdmin.getWorksheet('Obras');
    expect(worksSheet).toBeDefined();
    expect(worksSheet?.rowCount).toBeGreaterThanOrEqual(2);

    const wasteSheet = workbookAdmin.getWorksheet('Merma');
    expect(wasteSheet).toBeDefined();
    expect(wasteSheet?.rowCount).toBeGreaterThanOrEqual(2);

    // Now as regular user
    const ctxUser: any = { role: 'user' };
    const workbookUser = await ExportUseCases.exportWorks(ctxUser);
    const worksUserSheet = workbookUser.getWorksheet('Obras');
    const headers = worksUserSheet?.getRow(1).values as string[];
    expect(headers).not.toContain('Cobrado');
    expect(headers).not.toContain('Ganancia');
  });
});
