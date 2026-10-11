import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from './errorHandler';
import { z } from 'zod';

describe('errorHandler middleware', () => {
  const req: any = {};
  const next = vi.fn();

  it('handles ZodError with status 400 and issues', () => {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const schema = z.string().min(5);
    try {
      schema.parse('abc');
    } catch (err: any) {
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ message: 'Validation error' }),
      }));
    }
  });

  it('handles Mongoose ValidationError with status 400', () => {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const err: any = new Error('Field required');
    err.name = 'ValidationError';

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ message: 'Database validation error' }),
    }));
  });

  it('handles Mongoose duplicate key error 11000 with status 409', () => {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const err: any = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { email: 'dup@example.com' };

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ message: 'Duplicate entry' }),
    }));
  });

  it('handles generic unhandled error with status 500', () => {
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const err = new Error('Unexpected crash');

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ message: 'Internal server error' }),
    }));
  });

  it('includes error details when NODE_ENV is development', async () => {
    const { env } = await import('../config/env');
    const originalEnv = env.NODE_ENV;
    env.NODE_ENV = 'development';

    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const err = new Error('Dev crash message');

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ details: 'Dev crash message' }),
    }));

    env.NODE_ENV = originalEnv;
  });
});
