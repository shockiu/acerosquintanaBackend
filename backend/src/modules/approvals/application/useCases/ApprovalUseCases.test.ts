import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ApprovalUseCases } from './ApprovalUseCases';
import { ChangeRequest } from '../../../../models/ChangeRequest';
import { User } from '../../../../models/User';
import { changeHandlerRegistry } from '../../domain/ChangeHandlerRegistry';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('ApprovalUseCases', () => {
  let adminUser: any;
  let regularUser: any;

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
      email: 'admin_appr@aceros.com',
      passwordHash: 'hash',
      role: 'admin',
    });

    regularUser = await User.create({
      name: 'User',
      email: 'user_appr@aceros.com',
      passwordHash: 'hash',
      role: 'user',
    });
  });

  it('submits a new change request with pending status', async () => {
    const ctx: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await ApprovalUseCases.submitRequest(
      {
        entity: 'work',
        action: 'create',
        payload: { clientName: 'Obra 1' },
      },
      ctx
    );

    expect(request._id).toBeDefined();
    expect(request.status).toBe('pending');
    expect(request.requestedBy.toString()).toBe(regularUser._id.toString());
  });

  it('lists pending requests and filters by entity', async () => {
    const ctx: any = { actorId: regularUser._id.toString(), role: 'user' };
    await ApprovalUseCases.submitRequest({ entity: 'work', action: 'create', payload: {} }, ctx);
    await ApprovalUseCases.submitRequest({ entity: 'inventoryItem', action: 'create', payload: {} }, ctx);

    const allPending = await ApprovalUseCases.listPending({});
    expect(allPending).toHaveLength(2);

    const paginated: any = await ApprovalUseCases.listPending({}, 1, 1);
    expect(paginated.requests).toHaveLength(1);
    expect(paginated.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      pages: 2,
    });

    const workOnly = await ApprovalUseCases.listPending({ entity: 'work' });
    expect(workOnly).toHaveLength(1);
    expect(workOnly[0].entity).toBe('work');
  });

  it('approves a request atomically and triggers the domain handler', async () => {
    // Register a mock handler
    let handlerCalled = false;
    changeHandlerRegistry.register({
      entity: 'work',
      action: 'create',
      apply: async (req, overrides, ctx, tx) => {
        handlerCalled = true;
        return { success: true };
      },
    });

    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await ApprovalUseCases.submitRequest(
      { entity: 'work', action: 'create', payload: {} },
      ctxUser
    );

    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const approved = await ApprovalUseCases.approve(request._id.toString(), undefined, ctxAdmin);

    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy?.toString()).toBe(adminUser._id.toString());
    expect(handlerCalled).toBe(true);

    const fromDb = await ChangeRequest.findById(request._id);
    expect(fromDb?.status).toBe('approved');
  });

  it('throws error when approving already resolved or nonexistent request', async () => {
    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin' };
    const fakeId = new mongoose.Types.ObjectId().toString();

    await expect(ApprovalUseCases.approve(fakeId, {}, ctxAdmin)).rejects.toThrow(
      'Request not found or already resolved'
    );
  });

  it('rejects a pending request with a mandatory reason', async () => {
    const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
    const request = await ApprovalUseCases.submitRequest(
      { entity: 'work', action: 'create', payload: {} },
      ctxUser
    );

    const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
    const rejected = await ApprovalUseCases.reject(
      request._id.toString(),
      'Presupuesto insuficiente',
      ctxAdmin
    );

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Presupuesto insuficiente');
    expect(rejected.reviewedBy?.toString()).toBe(adminUser._id.toString());

    // Trying to reject again should throw
    await expect(
      ApprovalUseCases.reject(request._id.toString(), 'Otra razón', ctxAdmin)
    ).rejects.toThrow('Request not found or already resolved');
  });
});
