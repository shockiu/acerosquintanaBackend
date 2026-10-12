import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { InventoryUseCases } from './InventoryUseCases';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Remnant } from '../../../../models/Remnant';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { User } from '../../../../models/User';
import { ChangeRequest } from '../../../../models/ChangeRequest';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('InventoryUseCases', () => {
  let adminUser: any;
  let regularUser: any;
  let unitPieces: any;
  let unitMeters: any;
  let category: any;
  let subcategory: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin_inv@aceros.com',
      passwordHash: 'hash',
      role: 'admin',
    });

    regularUser = await User.create({
      name: 'Regular',
      email: 'user_inv@aceros.com',
      passwordHash: 'hash',
      role: 'user',
    });

    unitPieces = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    unitMeters = await Unit.create({ name: 'Metro', symbol: 'm', allowsDecimals: true });

    category = await Category.create({ name: 'Perfiles' });
    subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unitPieces._id });
  });

  it('lists items and enriches with piece tracking metrics when item has pieceSpec', async () => {
    const item = await InventoryItem.create({
      name: 'Tubo 6m Enriquecido',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 5, // 5 whole pieces
      avgUnitCost: '60.00', // $60 per piece ($10/m)
      pieceSpec: {
        pieceSize: 6.0,
        measureUnit: unitMeters._id,
        minUsableMeasure: 0.5,
      },
    });

    // Add 2 available remnants: 2m and 3m ($10/m each)
    await Remnant.create({
      item: item._id,
      measure: 2.0,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: adminUser._id,
    });
    await Remnant.create({
      item: item._id,
      measure: 3.0,
      costPerMeasureSnapshot: 10.0,
      status: 'available',
      createdBy: adminUser._id,
    });
    // Add 1 used remnant (should NOT count)
    await Remnant.create({
      item: item._id,
      measure: 1.0,
      costPerMeasureSnapshot: 10.0,
      status: 'used',
      createdBy: adminUser._id,
    });

    const items = await InventoryUseCases.listItems({});
    expect(items).toHaveLength(1);

    const enriched = items[0];
    expect(enriched.wholePieces).toBe(5);
    expect(enriched.availableRemnantsCount).toBe(2);
    expect(enriched.availableRemnantsMeasure).toBe(5); // 2 + 3
    // totalMeasure = 5 * 6 + 5 = 35
    expect(enriched.totalMeasure).toBe(35);
    // inventoryValue = 5 * 60 + (2*10 + 3*10) = 300 + 50 = 350
    expect(enriched.inventoryValue).toBe(350);
  });

  it('lists items without pieceSpec returning raw items without enrichment errors', async () => {
    await InventoryItem.create({
      name: 'Tornillo Simple',
      kind: 'tool',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 100,
      avgUnitCost: '0.10',
    });

    const items = await InventoryUseCases.listItems({ kind: 'tool' });
    expect(items).toHaveLength(1);
    expect(items[0].pieceSpec).toBeUndefined();
    expect(items[0].availableRemnantsCount).toBeUndefined();
  });

  it('gets remnants of an item with optional status filtering', async () => {
    const item = await InventoryItem.create({
      name: 'Tubo Test Remnants',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 2,
      avgUnitCost: '10',
    });

    await Remnant.create({ item: item._id, measure: 2, costPerMeasureSnapshot: 5, status: 'available', createdBy: adminUser._id });
    await Remnant.create({ item: item._id, measure: 1, costPerMeasureSnapshot: 5, status: 'discarded', createdBy: adminUser._id });

    const allRemnants = await InventoryUseCases.getItemRemnants(item._id.toString());
    expect(allRemnants).toHaveLength(2);

    const availableOnly = await InventoryUseCases.getItemRemnants(item._id.toString(), 'available');
    expect(availableOnly).toHaveLength(1);
    expect(availableOnly[0].status).toBe('available');
  });

  it('creates item directly as admin and via change request as user', async () => {
    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const createdByAdmin = await InventoryUseCases.createItem(
      {
        name: 'Item Admin',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unitPieces._id,
      },
      ctxAdmin
    );
    expect(createdByAdmin._id).toBeDefined();

    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await InventoryUseCases.createItem(
      {
        name: 'Item User',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unitPieces._id,
      },
      ctxUser
    );
    expect(request._id).toBeDefined();
    expect((request as any).entity).toBe('inventoryItem');
    expect((request as any).status).toBe('pending');
  });

  it('registers purchase directly as admin and strips costs if submitted by user', async () => {
    const item = await InventoryItem.create({
      name: 'Item Purchase',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 10,
      avgUnitCost: '5.00',
    });

    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const movement = await InventoryUseCases.registerPurchase(
      item._id.toString(),
      { quantity: 5, unitCost: 10 },
      ctxAdmin
    );
    expect(movement.type).toBe('purchase');

    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await InventoryUseCases.registerPurchase(
      item._id.toString(),
      { quantity: 5, unitCost: 10 }, // User tries to send cost!
      ctxUser
    );
    // User request should have unitCost stripped (R3 security rule)
    expect((request as any).payload.unitCost).toBeUndefined();
  });

  it('discards remnant directly as admin and via change request as user', async () => {
    const item = await InventoryItem.create({
      name: 'Item Remnant Discard',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unitPieces._id,
      stock: 1,
      avgUnitCost: '10',
    });

    const remnant = await Remnant.create({
      item: item._id,
      measure: 1.5,
      costPerMeasureSnapshot: 10,
      status: 'available',
      createdBy: adminUser._id,
    });

    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await InventoryUseCases.discardRemnant(remnant._id.toString(), 'Nota de descarte', ctxUser);
    expect((request as any).entity).toBe('remnant');
    expect((request as any).action).toBe('discard');

    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const discarded = await InventoryUseCases.discardRemnant(remnant._id.toString(), 'Descarte directo', ctxAdmin);
    expect(discarded.status).toBe('discarded');
  });

  it('updates item directly as admin and creates change request as user', async () => {
    const item = await InventoryItem.create({
      name: 'Item Para Actualizar',
      kind: 'material',
      subcategory: subcategory._id,
      stock: 5,
      avgUnitCost: 20,
    });

    // Operario: creates ChangeRequest
    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request: any = await InventoryUseCases.updateItem(
      item._id.toString(),
      { name: 'Item Nombre Solicitado' },
      ctxUser
    );
    expect(request.entity).toBe('inventoryItem');
    expect(request.action).toBe('update');
    expect(request.status).toBe('pending');
    expect(request.payload.name).toBe('Item Nombre Solicitado');

    // Admin: applies directly
    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const updated: any = await InventoryUseCases.updateItem(
      item._id.toString(),
      { name: 'Item Nombre Actualizado Admin' },
      ctxAdmin
    );
    expect(updated.name).toBe('Item Nombre Actualizado Admin');

    const inDb = await InventoryItem.findById(item._id);
    expect(inDb?.name).toBe('Item Nombre Actualizado Admin');
  });
});

