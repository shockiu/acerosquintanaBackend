import { describe, it, expect, vi } from 'vitest';
import { authorize } from './authorize';

describe('authorize middleware', () => {
  it('returns 401 if req.user is missing', () => {
    const req: any = {};
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if req.user role is not in allowed roles', () => {
    const req: any = { user: { role: 'user' } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() if req.user role is allowed', () => {
    const req: any = { user: { role: 'admin' } };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    authorize('admin', 'supervisor')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
