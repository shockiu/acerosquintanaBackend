import mongoose from 'mongoose';
import { IUnitOfWork } from '../domain/IUnitOfWork';

export class MongoUnitOfWork implements IUnitOfWork {
  async runInTransaction<T>(work: (tx: mongoose.ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const uow = new MongoUnitOfWork();
