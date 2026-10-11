import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { uow } from './MongoUnitOfWork';
import { Category } from '../../models/Category';
import { connectTestDb, clearTestDb, closeTestDb } from '../../tests/helpers/testDb';

describe('MongoUnitOfWork', () => {
  beforeAll(async () => {
    await connectTestDb();
    await Category.init();
    await Category.createCollection();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('commits transaction on success', async () => {
    const result = await uow.runInTransaction(async (session) => {
      const cat = new Category({ name: 'Trans Category' });
      await cat.save({ session });
      return cat;
    });

    expect(result._id).toBeDefined();
    const found = await Category.findById(result._id);
    expect(found?.name).toBe('Trans Category');
  });

  it('aborts transaction and rolls back when error occurs', async () => {
    await expect(
      uow.runInTransaction(async (session) => {
        const cat = new Category({ name: 'Aborted Category' });
        await cat.save({ session });
        throw new Error('Forced transaction failure');
      })
    ).rejects.toThrow('Forced transaction failure');

    const found = await Category.findOne({ name: 'Aborted Category' });
    expect(found).toBeNull();
  });

  it('handles error when session is not in transaction', async () => {
    await expect(
      uow.runInTransaction(async (session) => {
        await session.abortTransaction();
        throw new Error('Already aborted');
      })
    ).rejects.toThrow('Already aborted');
  });
});
