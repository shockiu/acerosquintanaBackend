import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AuthUseCases } from './AuthUseCases';
import { User } from '../../../../models/User';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

describe('AuthUseCases', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('successfully logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('secret123', 6);
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@aceros.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    const result = await AuthUseCases.login('admin@aceros.com', 'secret123');
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('admin@aceros.com');
    expect(result.user.role).toBe('admin');
  });

  it('throws error when user does not exist', async () => {
    await expect(AuthUseCases.login('notfound@aceros.com', 'pwd')).rejects.toThrow('Invalid credentials');
  });

  it('throws error when user is deactivated', async () => {
    const passwordHash = await bcrypt.hash('secret123', 6);
    await User.create({
      name: 'Inactive User',
      email: 'inactive@aceros.com',
      passwordHash,
      role: 'user',
      isActive: false,
    });

    await expect(AuthUseCases.login('inactive@aceros.com', 'secret123')).rejects.toThrow('User is deactivated');
  });

  it('throws error when password is wrong', async () => {
    const passwordHash = await bcrypt.hash('secret123', 6);
    await User.create({
      name: 'Active User',
      email: 'active@aceros.com',
      passwordHash,
      role: 'user',
      isActive: true,
    });

    await expect(AuthUseCases.login('active@aceros.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
  });

  it('returns current user profile with me()', async () => {
    const user = await User.create({
      name: 'Test Profile',
      email: 'profile@aceros.com',
      passwordHash: 'hashed',
      role: 'admin',
    });

    const result = await AuthUseCases.me(user._id.toString());
    expect(result.email).toBe('profile@aceros.com');
    expect(result.name).toBe('Test Profile');
  });

  it('throws error in me() when user is not found', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(AuthUseCases.me(fakeId)).rejects.toThrow('User not found');
  });
});
