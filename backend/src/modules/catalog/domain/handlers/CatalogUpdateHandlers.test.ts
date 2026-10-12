import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UpdateCategoryHandler } from './UpdateCategoryHandler';
import { UpdateSubcategoryHandler } from './UpdateSubcategoryHandler';
import { CatalogUseCases } from '../../application/useCases/CatalogUseCases';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { Unit } from '../../../../models/Unit';
import { User } from '../../../../models/User';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('Catalog Update Handlers & UseCases', () => {
  const categoryHandler = new UpdateCategoryHandler();
  const subcategoryHandler = new UpdateSubcategoryHandler();

  let adminUser: any;
  let regularUser: any;
  let unitPieces: any;
  let unitMeters: any;
  let cat1: any;
  let cat2: any;
  let sub1: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin_cat@test.com',
      passwordHash: 'hash',
      role: 'admin',
    });

    regularUser = await User.create({
      name: 'Operario',
      email: 'user_cat@test.com',
      passwordHash: 'hash',
      role: 'user',
    });

    unitPieces = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    unitMeters = await Unit.create({ name: 'Metro', symbol: 'm', allowsDecimals: true });

    cat1 = await Category.create({ name: 'Perfiles Estructurales', description: 'Vigas y tubos' });
    cat2 = await Category.create({ name: 'Tornillería', description: 'Fijaciones' });

    sub1 = await Subcategory.create({
      name: 'Tubos Redondos',
      category: cat1._id,
      unit: unitMeters._id,
      kind: 'material',
    });
  });

  describe('UpdateCategoryHandler', () => {
    it('updates name and description successfully', async () => {
      const request: any = {
        targetId: cat1._id,
        payload: { name: 'Perfiles Pesados', description: 'Vigas y perfiles HEA' },
      };
      const ctx: any = { actorId: adminUser._id.toString(), role: 'admin' };

      const updated = await categoryHandler.apply(request, {}, ctx, undefined);
      expect(updated.name).toBe('Perfiles Pesados');
      expect(updated.description).toBe('Vigas y perfiles HEA');
    });

    it('rejects duplicate category name', async () => {
      const request: any = {
        targetId: cat1._id,
        payload: { name: 'Tornillería' },
      };
      const ctx: any = { actorId: adminUser._id.toString(), role: 'admin' };

      await expect(categoryHandler.apply(request, {}, ctx, undefined)).rejects.toThrow(
        'Category name already exists'
      );
    });

    it('fails when category is not found', async () => {
      const request: any = {
        targetId: new mongoose.Types.ObjectId(),
        payload: { name: 'Otro' },
      };
      const ctx: any = { actorId: adminUser._id.toString(), role: 'admin' };

      await expect(categoryHandler.apply(request, {}, ctx, undefined)).rejects.toThrow(
        'Category not found'
      );
    });
  });

  describe('UpdateSubcategoryHandler', () => {
    it('updates subcategory fields successfully', async () => {
      const request: any = {
        targetId: sub1._id,
        payload: {
          name: 'Tubos Redondos ASTM',
          unit: unitPieces._id,
          kind: 'tool',
          isActive: false,
        },
      };
      const ctx: any = { actorId: adminUser._id.toString(), role: 'admin' };

      const updated = await subcategoryHandler.apply(request, {}, ctx, undefined);
      expect(updated.name).toBe('Tubos Redondos ASTM');
      expect(updated.kind).toBe('tool');
      expect(updated.isActive).toBe(false);
    });

    it('rejects duplicate subcategory name in the same category', async () => {
      await Subcategory.create({
        name: 'Tubos Cuadrados',
        category: cat1._id,
        unit: unitMeters._id,
      });

      const request: any = {
        targetId: sub1._id,
        payload: { name: 'Tubos Cuadrados' },
      };
      const ctx: any = { actorId: adminUser._id.toString(), role: 'admin' };

      await expect(subcategoryHandler.apply(request, {}, ctx, undefined)).rejects.toThrow(
        'Subcategory name already exists in this category'
      );
    });
  });

  describe('CatalogUseCases with ActionContext (Admin vs Operario)', () => {
    it('creates ChangeRequest when operator requests category update', async () => {
      const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
      const result: any = await CatalogUseCases.updateCategory(
        cat1._id.toString(),
        { name: 'Nombre Propuesto por Operario' },
        ctxUser
      );

      expect(result.entity).toBe('category');
      expect(result.action).toBe('update');
      expect(result.status).toBe('pending');
      expect(result.payload.name).toBe('Nombre Propuesto por Operario');
    });

    it('updates directly when admin requests category update', async () => {
      const ctxAdmin: any = { actorId: adminUser._id.toString(), role: 'admin', ip: '127.0.0.1' };
      const result: any = await CatalogUseCases.updateCategory(
        cat1._id.toString(),
        { name: 'Nombre Inmediato Admin' },
        ctxAdmin
      );

      expect(result.name).toBe('Nombre Inmediato Admin');
      const inDb = await Category.findById(cat1._id);
      expect(inDb?.name).toBe('Nombre Inmediato Admin');
    });

    it('creates ChangeRequest when operator requests subcategory update', async () => {
      const ctxUser: any = { actorId: regularUser._id.toString(), role: 'user' };
      const result: any = await CatalogUseCases.updateSubcategory(
        sub1._id.toString(),
        { name: 'Subcategoria Propuesta' },
        ctxUser
      );

      expect(result.entity).toBe('subcategory');
      expect(result.action).toBe('update');
      expect(result.status).toBe('pending');
    });
  });
});
