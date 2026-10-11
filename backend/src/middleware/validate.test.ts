import { describe, it, expect, vi } from 'vitest';
import { validate } from './validate';
import { z } from 'zod';

describe('validate middleware', () => {
  const schema = z.object({
    body: z.object({
      name: z.string().min(3),
    }),
  });

  it('calls next() without error if payload satisfies schema', async () => {
    const req: any = { body: { name: 'Viga IPE' }, query: {}, params: {} };
    const res: any = {};
    const next = vi.fn();

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('passes ZodError to next(err) if validation fails', async () => {
    const req: any = { body: { name: 'A' }, query: {}, params: {} };
    const res: any = {};
    const next = vi.fn();

    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(z.ZodError));
  });
});
