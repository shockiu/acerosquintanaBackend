import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UserUseCases } from './UserUseCases';
import { User } from '../../../../models/User';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

describe('UserUseCases', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('creates user with hashed password and without passwordHash in result', async () => {
    const user = await UserUseCases.createUser({
      name: 'Carlos Galeano',
      email: 'carlos@aceros.com',
      password: 'password123',
      role: 'admin',
    });

    expect(user._id).toBeDefined();
    expect(user.email).toBe('carlos@aceros.com');
    expect((user as any).passwordHash).toBeUndefined();

    const dbUser = await User.findById(user._id).select('+passwordHash');
    expect(dbUser?.passwordHash).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe('password123');
  });

  it('throws error when creating user with duplicate email', async () => {
    await UserUseCases.createUser({
      name: 'User 1',
      email: 'dup@aceros.com',
      password: 'password123',
      role: 'user',
    });

    await expect(
      UserUseCases.createUser({
        name: 'User 2',
        email: 'dup@aceros.com',
        password: 'password456',
        role: 'user',
      })
    ).rejects.toThrow('Email already in use');
  });

  it('lists all users sorted by creation date without passwords', async () => {
    await UserUseCases.createUser({
      name: 'User A',
      email: 'a@aceros.com',
      password: 'pwd',
      role: 'user',
    });
    await UserUseCases.createUser({
      name: 'User B',
      email: 'b@aceros.com',
      password: 'pwd',
      role: 'admin',
    });

    const list = await UserUseCases.listUsers();
    expect(list).toHaveLength(2);
    expect(list[0].passwordHash).toBeUndefined();
  });

  it('updates an existing user and prevents duplicate email with another user', async () => {
    const u1 = await UserUseCases.createUser({
      name: 'User One',
      email: 'one@aceros.com',
      password: 'pwd',
      role: 'user',
    });
    const u2 = await UserUseCases.createUser({
      name: 'User Two',
      email: 'two@aceros.com',
      password: 'pwd',
      role: 'user',
    });

    const updated = await UserUseCases.updateUser(u1._id.toString(), { name: 'User One Updated' });
    expect(updated.name).toBe('User One Updated');

    const updatedEmail = await UserUseCases.updateUser(u1._id.toString(), { email: 'newone@aceros.com' });
    expect(updatedEmail.email).toBe('newone@aceros.com');

    await expect(
      UserUseCases.updateUser(u1._id.toString(), { email: 'two@aceros.com' })
    ).rejects.toThrow('Email already in use');
  });

  it('throws error if updating nonexistent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(UserUseCases.updateUser(fakeId, { name: 'Test' })).rejects.toThrow('User not found');
  });

  it('toggles user active status', async () => {
    const user = await UserUseCases.createUser({
      name: 'Active Toggle',
      email: 'toggle@aceros.com',
      password: 'pwd',
      role: 'user',
    });

    const deactivated = await UserUseCases.toggleStatus(user._id.toString(), false);
    expect(deactivated.isActive).toBe(false);

    const reactivated = await UserUseCases.toggleStatus(user._id.toString(), true);
    expect(reactivated.isActive).toBe(true);
  });

  it('throws error if toggling status on nonexistent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(UserUseCases.toggleStatus(fakeId, false)).rejects.toThrow('User not found');
  });

  it('changes password successfully with bcrypt hashing', async () => {
    const user = await UserUseCases.createUser({
      name: 'Password User',
      email: 'pwdchange@aceros.com',
      password: 'initialPassword1',
      role: 'user',
    });

    const updated = await UserUseCases.changePassword(user._id.toString(), 'newPassword999');
    expect(updated._id).toBeDefined();
    expect((updated as any).passwordHash).toBeUndefined();

    const dbUser = await User.findById(user._id).select('+passwordHash');
    expect(dbUser?.passwordHash).toBeDefined();
    const isNewValid = await bcrypt.compare('newPassword999', dbUser!.passwordHash);
    expect(isNewValid).toBe(true);

    const isOldValid = await bcrypt.compare('initialPassword1', dbUser!.passwordHash);
    expect(isOldValid).toBe(false);
  });

  it('throws error when changing password of nonexistent user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(UserUseCases.changePassword(fakeId, 'secret123')).rejects.toThrow('User not found');
  });

  it('paginates and searches users in listUsers', async () => {
    await UserUseCases.createUser({
      name: 'Alpha Search',
      email: 'alpha@aceros.com',
      password: 'pwd',
      role: 'user',
    });
    await UserUseCases.createUser({
      name: 'Beta User',
      email: 'beta@aceros.com',
      password: 'pwd',
      role: 'admin',
    });

    const paginated: any = await UserUseCases.listUsers({ search: 'alpha' }, 1, 10);
    expect(paginated.users).toHaveLength(1);
    expect(paginated.users[0].name).toBe('Alpha Search');
    expect(paginated.pagination.total).toBe(1);
    expect(paginated.pagination.page).toBe(1);
  });

  it('prevents self-deactivation of admin user', async () => {
    const admin = await UserUseCases.createUser({
      name: 'Admin Self',
      email: 'adminself@aceros.com',
      password: 'pwd',
      role: 'admin',
    });

    await expect(
      UserUseCases.toggleStatus(admin._id.toString(), false, admin._id.toString())
    ).rejects.toThrow('No puedes desactivar tu propia cuenta');
  });
});

