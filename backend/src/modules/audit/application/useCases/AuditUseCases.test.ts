import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuditUseCases } from './AuditUseCases';
import { auditLogger } from '../../infrastructure/persistence/AuditLogger';
import { User } from '../../../../models/User';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';

describe('AuditUseCases & MongoAuditLogger', () => {
  let user: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    user = await User.create({
      name: 'Auditor User',
      email: 'audit@aceros.com',
      passwordHash: 'hash',
      role: 'admin',
    });
  });

  it('logs audit entry and retrieves it via listLogs with pagination', async () => {
    await auditLogger.log({
      actor: user._id.toString(),
      action: 'work.create',
      entity: 'Work',
      entityId: '123',
      after: { name: 'Obra 1' },
      ip: '192.168.1.1',
    });

    const result = await AuditUseCases.listLogs({}, 1, 10);
    expect(result.logs).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pages).toBe(1);
    expect(result.logs[0].action).toBe('work.create');
  });

  it('filters audit logs by actor, action, and entity', async () => {
    await auditLogger.log({
      actor: user._id.toString(),
      action: 'inventory.update',
      entity: 'InventoryItem',
    });
    await auditLogger.log({
      actor: user._id.toString(),
      action: 'work.delete',
      entity: 'Work',
    });

    const inventoryLogs = await AuditUseCases.listLogs({ entity: 'InventoryItem' });
    expect(inventoryLogs.logs).toHaveLength(1);
    expect(inventoryLogs.logs[0].entity).toBe('InventoryItem');

    const actionLogs = await AuditUseCases.listLogs({ action: 'work.delete' });
    expect(actionLogs.logs).toHaveLength(1);

    const actorLogs = await AuditUseCases.listLogs({ actor: user._id.toString() });
    expect(actorLogs.logs).toHaveLength(2);
  });
});
