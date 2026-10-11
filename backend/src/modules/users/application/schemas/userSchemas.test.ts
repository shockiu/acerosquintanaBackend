import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema, toggleUserStatusSchema } from './userSchemas';

describe('userSchemas', () => {
  it('validates createUserSchema', () => {
    const valid = {
      body: {
        name: 'Maria Gomez',
        email: 'maria@aceros.com',
        password: 'password123',
        role: 'user' as const,
      },
    };
    expect(createUserSchema.parse(valid)).toEqual(valid);

    // Reject short password
    expect(() =>
      createUserSchema.parse({
        body: { ...valid.body, password: '123' },
      })
    ).toThrow();
  });

  it('validates updateUserSchema and toggleUserStatusSchema', () => {
    const validUpdate = {
      body: { name: 'Maria Gomez Updated' },
      params: { id: 'u1' },
    };
    expect(updateUserSchema.parse(validUpdate)).toEqual(validUpdate);

    const validToggle = {
      body: { isActive: false },
      params: { id: 'u1' },
    };
    expect(toggleUserStatusSchema.parse(validToggle)).toEqual(validToggle);
  });
});
