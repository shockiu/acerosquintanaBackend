import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User, IUser } from '../../models/User';

export const createTestUser = async (overrides?: Partial<IUser>): Promise<IUser> => {
  const user = new User({
    name: overrides?.name || 'Test User',
    email: overrides?.email || `user_${Date.now()}_${Math.random()}@example.com`,
    passwordHash: overrides?.passwordHash || '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    role: overrides?.role || 'admin',
    isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
  });
  await user.save();
  return user;
};

export const generateTestToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });
};
