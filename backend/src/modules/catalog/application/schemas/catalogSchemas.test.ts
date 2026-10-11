import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
} from './catalogSchemas';

describe('catalogSchemas', () => {
  it('validates createCategorySchema and updateCategorySchema', () => {
    const validCreate = { body: { name: 'Vigas', description: 'Vigas de acero' } };
    expect(createCategorySchema.parse(validCreate)).toEqual(validCreate);

    const validUpdate = { body: { name: 'Vigas IPE' }, params: { id: 'cat1' } };
    expect(updateCategorySchema.parse(validUpdate)).toEqual(validUpdate);
  });

  it('validates createSubcategorySchema and updateSubcategorySchema', () => {
    const validCreate = {
      body: {
        category: 'cat1',
        name: 'IPE 100',
        unit: 'unit1',
      },
    };
    expect(createSubcategorySchema.parse(validCreate)).toEqual(validCreate);

    const validUpdate = {
      body: { name: 'IPE 120' },
      params: { id: 'sub1' },
    };
    expect(updateSubcategorySchema.parse(validUpdate)).toEqual(validUpdate);
  });
});
