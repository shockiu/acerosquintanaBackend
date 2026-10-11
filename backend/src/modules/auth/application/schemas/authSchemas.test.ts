import { describe, it, expect } from 'vitest';
import { loginSchema } from './authSchemas';

describe('authSchemas', () => {
  it('validates correct login credentials', () => {
    const valid = {
      body: {
        email: 'user@aceros.com',
        password: 'password123',
      },
    };
    expect(loginSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid email address', () => {
    expect(() =>
      loginSchema.parse({
        body: {
          email: 'not-an-email',
          password: 'pass',
        },
      })
    ).toThrow();
  });
});
