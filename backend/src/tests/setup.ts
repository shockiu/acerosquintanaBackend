// Test setup file for Vitest
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345678901234567890';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.SEED_ADMIN_EMAIL = 'admin@test.com';
process.env.SEED_ADMIN_PASSWORD = 'password123';

import { registerChangeHandlers } from '../config/handlers';
registerChangeHandlers();
