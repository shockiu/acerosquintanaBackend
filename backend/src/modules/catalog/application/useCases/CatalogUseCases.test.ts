import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CatalogUseCases } from './CatalogUseCases';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('CatalogUseCases', () => {
  let unit: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    unit = await Unit.create({ name: 'Metro', symbol: 'm', allowsDecimals: true });
  });

  it('lists all units', async () => {
    await Unit.create({ name: 'Kilogramo', symbol: 'kg', allowsDecimals: true });
    const units = await CatalogUseCases.listUnits();
    expect(units).toHaveLength(2);
  });

  it('creates category and lists categories', async () => {
    const cat = await CatalogUseCases.createCategory({ name: 'Vigas' });
    expect(cat._id).toBeDefined();
    expect(cat.name).toBe('Vigas');

    const list = await CatalogUseCases.listCategories();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Vigas');
  });

  it('prevents duplicate category creation', async () => {
    await CatalogUseCases.createCategory({ name: 'Láminas' });
    await expect(CatalogUseCases.createCategory({ name: 'Láminas' })).rejects.toThrow(
      'Category name already exists'
    );
  });

  it('updates category and prevents duplicate names', async () => {
    const c1 = await CatalogUseCases.createCategory({ name: 'Cat 1' });
    const c2 = await CatalogUseCases.createCategory({ name: 'Cat 2' });

    const updated = await CatalogUseCases.updateCategory(c1._id.toString(), { name: 'Cat 1 Renamed' });
    expect(updated.name).toBe('Cat 1 Renamed');

    const updatedCatWithoutName = await CatalogUseCases.updateCategory(c1._id.toString(), {});
    expect(updatedCatWithoutName._id).toBeDefined();

    await expect(
      CatalogUseCases.updateCategory(c1._id.toString(), { name: 'Cat 2' })
    ).rejects.toThrow('Category name already exists');
  });

  it('throws error when updating nonexistent category', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(CatalogUseCases.updateCategory(fakeId, { name: 'Test' })).rejects.toThrow(
      'Category not found'
    );
  });

  it('creates subcategory and lists with population and filtering', async () => {
    const cat = await CatalogUseCases.createCategory({ name: 'Perfiles' });
    const sub = await CatalogUseCases.createSubcategory({
      name: 'Ángulos',
      category: cat._id,
      unit: unit._id,
    });

    expect(sub.name).toBe('Ángulos');
    expect(sub.category).toBeDefined();

    const allSubs = await CatalogUseCases.listSubcategories();
    expect(allSubs).toHaveLength(1);

    const filtered = await CatalogUseCases.listSubcategories(cat._id.toString());
    expect(filtered).toHaveLength(1);

    const emptyFilter = await CatalogUseCases.listSubcategories(new mongoose.Types.ObjectId().toString());
    expect(emptyFilter).toHaveLength(0);
  });

  it('prevents duplicate subcategory name within the same category', async () => {
    const cat = await CatalogUseCases.createCategory({ name: 'Tubos Cat' });
    await CatalogUseCases.createSubcategory({
      name: 'Redondos',
      category: cat._id,
      unit: unit._id,
    });

    await expect(
      CatalogUseCases.createSubcategory({
        name: 'Redondos',
        category: cat._id,
        unit: unit._id,
      })
    ).rejects.toThrow('Subcategory name already exists in this category');
  });

  it('updates subcategory and validates duplicates within category', async () => {
    const cat = await CatalogUseCases.createCategory({ name: 'Mallas Cat' });
    const s1 = await CatalogUseCases.createSubcategory({ name: 'Malla A', category: cat._id, unit: unit._id });
    const s2 = await CatalogUseCases.createSubcategory({ name: 'Malla B', category: cat._id, unit: unit._id });

    const updated = await CatalogUseCases.updateSubcategory(s1._id.toString(), { name: 'Malla A Plus' });
    expect(updated?.name).toBe('Malla A Plus');

    const updatedWithoutName = await CatalogUseCases.updateSubcategory(s1._id.toString(), {});
    expect(updatedWithoutName?._id).toBeDefined();

    await expect(
      CatalogUseCases.updateSubcategory(s1._id.toString(), { name: 'Malla B' })
    ).rejects.toThrow('Subcategory name already exists in this category');
  });

  it('throws error when updating nonexistent subcategory', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(CatalogUseCases.updateSubcategory(fakeId, { name: 'Test' })).rejects.toThrow(
      'Subcategory not found'
    );
  });
});
