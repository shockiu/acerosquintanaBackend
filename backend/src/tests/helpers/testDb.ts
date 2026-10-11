import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongod: MongoMemoryReplSet | null = null;

export const connectTestDb = async () => {
  if (mongod) return;
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

export const clearTestDb = async () => {
  if (!mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

export const closeTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};
