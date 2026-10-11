import { describe, it, expect } from 'vitest';
import { approveRequestSchema, rejectRequestSchema } from './approvalSchemas';

describe('approvalSchemas', () => {
  it('validates approveRequestSchema with overrides and id', () => {
    const valid = {
      body: { overrides: { chargedPrice: 500 } },
      params: { id: 'req123' },
    };
    expect(approveRequestSchema.parse(valid)).toEqual(valid);
  });

  it('validates rejectRequestSchema requiring reason and id', () => {
    const valid = {
      body: { reason: 'Sin presupuesto' },
      params: { id: 'req123' },
    };
    expect(rejectRequestSchema.parse(valid)).toEqual(valid);

    expect(() =>
      rejectRequestSchema.parse({
        body: { reason: '' },
        params: { id: 'req123' },
      })
    ).toThrow();
  });
});
