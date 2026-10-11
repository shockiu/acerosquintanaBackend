import { describe, it, expect } from 'vitest';
import { success, fail } from './httpResponse';

describe('httpResponse helper', () => {
  it('formats success response correctly', () => {
    const payload = { id: '123', name: 'Test' };
    const res = success(payload);
    expect(res).toEqual({
      ok: true,
      data: payload,
    });
  });

  it('formats fail response without details correctly', () => {
    const res = fail('Something went wrong');
    expect(res).toEqual({
      ok: false,
      error: {
        message: 'Something went wrong',
        details: undefined,
      },
    });
  });

  it('formats fail response with details correctly', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const res = fail('Validation error', details);
    expect(res).toEqual({
      ok: false,
      error: {
        message: 'Validation error',
        details,
      },
    });
  });
});
