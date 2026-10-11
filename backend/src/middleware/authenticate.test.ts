import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { authenticate } from './authenticate';
import { connectTestDb, clearTestDb, closeTestDb } from '../tests/helpers/testDb';
import { createTestUser, generateTestToken } from '../tests/helpers/authHelper';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

describe('authenticate middleware', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('returns 401 if Authorization header is missing', async () => {
    const req: any = { headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if Authorization header does not start with Bearer', async () => {
    const req: any = { headers: { authorization: 'Basic 123456' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 if token is invalid or corrupted', async () => {
    const req: any = { headers: { authorization: 'Bearer invalid.token.signature' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 if user from valid token does not exist in DB', async () => {
    const token = jwt.sign({ userId: '65f1a2b3c4d5e6f7a8b9c0d1' }, env.JWT_SECRET);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 if user is deactivated (isActive = false)', async () => {
    const user = await createTestUser({ isActive: false });
    const token = generateTestToken(user._id.toString());
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ message: 'Forbidden: User is deactivated' }),
    }));
  });

  it('injects req.user and calls next() for active authenticated user', async () => {
    const user = await createTestUser({ isActive: true, role: 'admin' });
    const token = generateTestToken(user._id.toString());
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(user._id.toString());
    expect(req.user.role).toBe('admin');
  });
});
