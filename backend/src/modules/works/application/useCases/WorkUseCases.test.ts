import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WorkUseCases } from './WorkUseCases';
import { Work } from '../../../../models/Work';
import { ChangeRequest } from '../../../../models/ChangeRequest';
import { User } from '../../../../models/User';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('WorkUseCases', () => {
  let adminUser: any;
  let regularUser: any;
  let testItem: any;

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
      email: 'admin_w@aceros.com',
      passwordHash: 'hash',
      role: 'admin',
    });

    regularUser = await User.create({
      name: 'Regular',
      email: 'user_w@aceros.com',
      passwordHash: 'hash',
      role: 'user',
    });

    const unit = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    const category = await Category.create({ name: 'Perfiles' });
    const subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unit._id });

    testItem = await InventoryItem.create({
      name: 'Tubo 1"',
      kind: 'material',
      category: category._id,
      subcategory: subcategory._id,
      unit: unit._id,
      stock: 50,
      avgUnitCost: '10.00',
    });
  });

  it('lists works and retrieves work by id with populated items', async () => {
    const work = await Work.create({
      clientName: 'Cliente Test',
      performedAt: new Date(),
      status: 'approved',
      createdBy: adminUser._id,
      items: [
        {
          item: testItem._id,
          kind: 'material',
          quantity: 2,
        },
      ],
    });

    const list = await WorkUseCases.listWorks();
    expect(list).toHaveLength(1);

    const paginated: any = await WorkUseCases.listWorks({}, 1, 10);
    expect(paginated.works).toHaveLength(1);
    expect(paginated.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      pages: 1,
    });

    const fetched = await WorkUseCases.getWorkById(work._id.toString());
    expect(fetched._id.toString()).toBe(work._id.toString());
    expect(fetched.clientName).toBe('Cliente Test');
  });

  it('throws error in getWorkById when work not found', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(WorkUseCases.getWorkById(fakeId)).rejects.toThrow('Work not found');
  });

  it('creates work as regular user by submitting approval request and pending work', async () => {
    const ctx: any = { actorId: regularUser._id.toString(), role: 'user' };
    const work = await WorkUseCases.createWork(
      {
        clientName: 'Cliente User Flow',
        performedAt: new Date().toISOString(),
        items: [{ item: testItem._id.toString(), kind: 'material', quantity: 1 }],
      },
      ctx
    );

    expect(work.status).toBe('pending_approval');
    expect(work.createdBy.toString()).toBe(regularUser._id.toString());

    const request = await ChangeRequest.findOne({ entity: 'work', action: 'create' });
    expect(request).toBeDefined();
    expect(request?.targetId?.toString()).toBe(work._id.toString());

    // Creating work without items defaults to []
    const workNoItems = await WorkUseCases.createWork(
      { clientName: 'Sin Items', performedAt: new Date().toISOString() },
      ctx
    );
    expect(workNoItems.items).toHaveLength(0);
  });

  it('creates work directly as admin using transaction and change handler', async () => {
    const ctx: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const work = await WorkUseCases.createWork(
      {
        clientName: 'Cliente Admin Flow',
        performedAt: new Date().toISOString(),
        chargedPrice: 100,
        items: [{ item: testItem._id.toString(), kind: 'material', quantity: 2 }],
      },
      ctx
    );

    expect(work.status).toBe('approved');
    expect(work.approvedBy?.toString()).toBe(adminUser._id.toString());
  });

  it('submits change request when regular user calls reverseWork', async () => {
    const work = await Work.create({
      clientName: 'Obra Para Revertir',
      performedAt: new Date(),
      status: 'approved',
      createdBy: adminUser._id,
    });

    const ctx: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await WorkUseCases.reverseWork(work._id.toString(), ctx);

    expect(request._id).toBeDefined();
    expect((request as any).entity).toBe('work');
    expect((request as any).action).toBe('delete');

    // Attempting reversal a second time while pending should fail
    await expect(WorkUseCases.reverseWork(work._id.toString(), ctx)).rejects.toThrow(
      'Esta obra ya tiene una solicitud de reversión pendiente en cola para aprobación del administrador.'
    );
  });

  it('reverses work directly as admin in transaction', async () => {
    const work = await Work.create({
      clientName: 'Obra Revertida Directa',
      performedAt: new Date(),
      status: 'approved',
      createdBy: adminUser._id,
      items: [
        {
          item: testItem._id,
          kind: 'material',
          quantity: 2,
        },
      ],
    });

    const ctx: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const reversed = await WorkUseCases.reverseWork(work._id.toString(), ctx);

    expect(reversed.status).toBe('rejected');
  });
});
