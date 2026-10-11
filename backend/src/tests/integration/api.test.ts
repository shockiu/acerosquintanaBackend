import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { connectTestDb, clearTestDb, closeTestDb } from '../helpers/testDb';
import { createTestUser, generateTestToken } from '../helpers/authHelper';
import { Category } from '../../models/Category';
import { Subcategory } from '../../models/Subcategory';
import { Unit } from '../../models/Unit';
import { InventoryItem } from '../../models/InventoryItem';
import { Remnant } from '../../models/Remnant';
import { Work } from '../../models/Work';
import { User } from '../../models/User';
import { ChangeRequest } from '../../models/ChangeRequest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

describe('HTTP API Endpoints (Integration)', () => {
  let admin: any;
  let adminToken: string;
  let regularUser: any;
  let userToken: string;
  let unit: any;
  let category: any;
  let subcategory: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    const pwd = await bcrypt.hash('password123', 6);
    admin = await createTestUser({ email: 'admin_api@aceros.com', role: 'admin', passwordHash: pwd });
    adminToken = generateTestToken(admin._id.toString());

    regularUser = await createTestUser({ email: 'user_api@aceros.com', role: 'user', passwordHash: pwd });
    userToken = generateTestToken(regularUser._id.toString());

    unit = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    category = await Category.create({ name: 'Perfiles' });
    subcategory = await Subcategory.create({ name: 'Tubos', category: category._id, unit: unit._id });
  });

  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  describe('Auth routes (/api/auth)', () => {
    it('POST /api/auth/login logs in and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_api@aceros.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('POST /api/auth/login returns 401 on invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_api@aceros.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('POST /api/auth/login returns 401 when user is deactivated', async () => {
      await User.findByIdAndUpdate(admin._id, { isActive: false });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_api@aceros.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('User is deactivated');

      await User.findByIdAndUpdate(admin._id, { isActive: true });
    });

    it('GET /api/auth/me returns current user info', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin_api@aceros.com');
    });

    it('GET /api/auth/me returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Users routes (/api/users)', () => {
    it('GET /api/users lists users for admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('POST /api/users creates a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Nuevo Operador',
          email: 'operador@aceros.com',
          password: 'password123',
          role: 'user',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Nuevo Operador');
    });

    it('POST /api/users returns 409 on duplicate email', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicado',
          email: 'admin_api@aceros.com',
          password: 'password123',
          role: 'user',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Email already in use');
    });

    it('PATCH /api/users/:id updates user', async () => {
      const res = await request(app)
        .patch(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Regular Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Regular Updated');
    });

    it('PATCH /api/users/:id returns 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Does Not Exist' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('User not found');
    });

    it('PATCH /api/users/:id returns 409 when updating to existing email', async () => {
      const res = await request(app)
        .patch(`/api/users/${regularUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'admin_api@aceros.com' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Email already in use');
    });

    it('PATCH /api/users/:id/status toggles status', async () => {
      const res = await request(app)
        .patch(`/api/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('PATCH /api/users/:id/status returns 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/users/${nonExistentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
    });
  });

  describe('Catalog routes (/api/catalog)', () => {
    it('GET /api/catalog/units lists units', async () => {
      const res = await request(app)
        .get('/api/catalog/units')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/catalog/categories and POST /api/catalog/categories', async () => {
      const postRes = await request(app)
        .post('/api/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Láminas' });
      expect(postRes.status).toBe(201);

      const getRes = await request(app)
        .get('/api/catalog/categories')
        .set('Authorization', `Bearer ${userToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toHaveLength(2);
    });

    it('POST /api/catalog/categories returns 409 on duplicate name', async () => {
      const res = await request(app)
        .post('/api/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Perfiles' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Category name already exists');
    });

    it('PATCH /api/catalog/categories/:id updates category', async () => {
      const res = await request(app)
        .patch(`/api/catalog/categories/${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Perfiles Pesados' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Perfiles Pesados');
    });

    it('PATCH /api/catalog/categories/:id returns 404 for non-existent category', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/catalog/categories/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'No Existe' });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Category not found');
    });

    it('PATCH /api/catalog/categories/:id returns 409 on duplicate name', async () => {
      const other = await Category.create({ name: 'Otra Categoria' });
      const res = await request(app)
        .patch(`/api/catalog/categories/${other._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Perfiles' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Category name already exists');
    });

    it('GET, POST, and PATCH /api/catalog/subcategories with query filters and errors', async () => {
      const postRes = await request(app)
        .post('/api/catalog/subcategories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: category._id.toString(),
          name: 'Vigas UPN',
          unit: unit._id.toString(),
        });
      expect(postRes.status).toBe(201);

      // GET with categoryId query
      const getFilteredRes = await request(app)
        .get(`/api/catalog/subcategories?categoryId=${category._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getFilteredRes.status).toBe(200);
      expect(getFilteredRes.body.data.length).toBeGreaterThanOrEqual(2);

      // POST duplicate subcategory returns 409
      const dupRes = await request(app)
        .post('/api/catalog/subcategories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: category._id.toString(),
          name: 'Tubos',
          unit: unit._id.toString(),
        });
      expect(dupRes.status).toBe(409);

      // PATCH success
      const patchRes = await request(app)
        .patch(`/api/catalog/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tubos Redondos' });
      expect(patchRes.status).toBe(200);

      // PATCH 404 for non-existent subcategory
      const nonExistentId = new mongoose.Types.ObjectId();
      const patch404Res = await request(app)
        .patch(`/api/catalog/subcategories/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fantasma' });
      expect(patch404Res.status).toBe(404);

      // PATCH duplicate returns 409
      const patchDupRes = await request(app)
        .patch(`/api/catalog/subcategories/${subcategory._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Vigas UPN' });
      expect(patchDupRes.status).toBe(409);
    });
  });

  describe('Inventory routes (/api/inventory)', () => {
    it('POST /api/inventory/items creates item', async () => {
      const res = await request(app)
        .post('/api/inventory/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tubo 2x2',
          kind: 'material',
          subcategory: subcategory._id.toString(),
        });

      expect(res.status).toBe(202);
    });

    it('GET /api/inventory/items lists items with serialized metrics and filters', async () => {
      await InventoryItem.create({
        name: 'Item List Test',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unit._id,
        stock: 5,
        avgUnitCost: '20.00',
      });

      // User sees it without avgUnitCost
      const userRes = await request(app)
        .get(`/api/inventory/items?subcategory=${subcategory._id}&kind=material`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(userRes.status).toBe(200);
      expect(userRes.body.data[0].avgUnitCost).toBeUndefined();

      // Admin sees avgUnitCost
      const adminRes = await request(app)
        .get('/api/inventory/items')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data[0].avgUnitCost).toBe('20.00');
    });

    it('POST /api/inventory/items/:id/purchases registers purchase', async () => {
      const item = await InventoryItem.create({
        name: 'Item For Purchase',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unit._id,
        stock: 0,
        avgUnitCost: '0',
      });

      const res = await request(app)
        .post(`/api/inventory/items/${item._id}/purchases`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 10,
          unitCost: 15,
        });

      expect(res.status).toBe(202);
    });

    it('GET /api/inventory/items/:id/remnants and POST /api/inventory/remnants/:id/discard', async () => {
      const item = await InventoryItem.create({
        name: 'Item With Remnants',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unit._id,
        stock: 1,
        avgUnitCost: '10',
      });

      const remnant = await Remnant.create({
        item: item._id,
        measure: 2.0,
        costPerMeasureSnapshot: 10,
        status: 'available',
        createdBy: admin._id,
      });

      const getRes = await request(app)
        .get(`/api/inventory/items/${item._id}/remnants?status=available`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toHaveLength(1);

      const discardRes = await request(app)
        .post(`/api/inventory/remnants/${remnant._id}/discard`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Descarte API' });
      expect(discardRes.status).toBe(202);

      // Discarding again when already discarded returns 400
      const discardAgainRes = await request(app)
        .post(`/api/inventory/remnants/${remnant._id}/discard`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Re-descarte' });
      expect(discardAgainRes.status).toBe(400);
      expect(discardAgainRes.body.error.message).toContain('no está disponible');
    });
  });

  describe('Works routes (/api/works)', () => {
    it('POST /api/works creates work and GET /api/works lists works', async () => {
      const item = await InventoryItem.create({
        name: 'Item Work Test',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unit._id,
        stock: 20,
        avgUnitCost: '5.00',
      });

      const postRes = await request(app)
        .post('/api/works')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientName: 'Cliente API Obra',
          performedAt: new Date().toISOString(),
          chargedPrice: 100,
          items: [{ item: item._id.toString(), quantity: 2 }],
        });
      expect(postRes.status).toBe(202);

      const workId = postRes.body.data._id;

      const getOne = await request(app)
        .get(`/api/works/${workId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getOne.status).toBe(200);
      expect(getOne.body.data.profit).toBeUndefined(); // User does not see profit

      const getList = await request(app)
        .get('/api/works')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getList.status).toBe(200);
      expect(getList.body.data[0].profit).toBeDefined(); // Admin sees profit
    });

    it('GET /api/works/:id returns 404 for non-existent work', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/works/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Work not found');
    });

    it('POST /api/works returns 400 when stock is insufficient', async () => {
      const item = await InventoryItem.create({
        name: 'Item Sin Stock',
        kind: 'material',
        category: category._id,
        subcategory: subcategory._id,
        unit: unit._id,
        stock: 2,
        avgUnitCost: '5.00',
      });

      const res = await request(app)
        .post('/api/works')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientName: 'Cliente Sin Stock',
          performedAt: new Date().toISOString(),
          chargedPrice: 50,
          items: [{ item: item._id.toString(), quantity: 100 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Stock insuficiente');
    });

    it('POST /api/works/:id/reverse and /reversal reverses work and returns 400 when not approved', async () => {
      const work = await Work.create({
        clientName: 'Obra Para Revertir API',
        performedAt: new Date(),
        status: 'approved',
        createdBy: admin._id,
      });

      const revRes = await request(app)
        .post(`/api/works/${work._id}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(revRes.status).toBe(202);

      // Reversing a work not approved returns 400
      const pendingWork = await Work.create({
        clientName: 'Obra Pending',
        performedAt: new Date(),
        status: 'pending_approval',
        createdBy: admin._id,
      });

      const errRes = await request(app)
        .post(`/api/works/${pendingWork._id}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(errRes.status).toBe(400);
      expect(errRes.body.error.message).toContain('Solo se pueden revertir obras aprobadas');
    });
  });

  describe('Approvals routes (/api/requests)', () => {
    it('lists pending requests filtered by entity, approves and rejects requests', async () => {
      const changeReq1 = await ChangeRequest.create({
        entity: 'inventoryItem',
        action: 'create',
        requestedBy: regularUser._id,
        payload: {
          name: 'Item In Request 1',
          kind: 'material',
          subcategory: subcategory._id.toString(),
        },
        status: 'pending',
      });

      const changeReq2 = await ChangeRequest.create({
        entity: 'inventoryItem',
        action: 'create',
        requestedBy: regularUser._id,
        payload: {
          name: 'Item In Request 2',
          kind: 'material',
          subcategory: subcategory._id.toString(),
        },
        status: 'pending',
      });

      // Filter by entity
      const reqRes = await request(app)
        .get('/api/requests?entity=inventoryItem')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reqRes.status).toBe(200);
      expect(reqRes.body.data.length).toBeGreaterThanOrEqual(2);

      // Approve request 1
      const approveRes = await request(app)
        .post(`/api/requests/${changeReq1._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ overrides: {} });
      expect(approveRes.status).toBe(200);

      // Approving already approved request returns 409
      const approveAgainRes = await request(app)
        .post(`/api/requests/${changeReq1._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ overrides: {} });
      expect(approveAgainRes.status).toBe(409);
      expect(approveAgainRes.body.error.message).toContain('already resolved');

      // Reject request 2
      const rejectRes = await request(app)
        .post(`/api/requests/${changeReq2._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Rechazo justificado' });
      expect(rejectRes.status).toBe(200);

      // Rejecting already rejected request returns 409
      const rejectAgainRes = await request(app)
        .post(`/api/requests/${changeReq2._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Rechazo duplicado' });
      expect(rejectAgainRes.status).toBe(409);
      expect(rejectAgainRes.body.error.message).toContain('already resolved');
    });
  });

  describe('Audit routes (/api/audit)', () => {
    it('GET /api/audit lists audit logs with query filters for admin', async () => {
      const res = await request(app)
        .get(`/api/audit?page=1&limit=5&actor=${admin._id}&action=test&entity=ChangeRequest`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.logs).toBeDefined();
    });
  });

  describe('Exports routes (/api/exports)', () => {
    it('GET /api/exports/inventory and /works downloads excel files', async () => {
      const invRes = await request(app)
        .get('/api/exports/inventory')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(invRes.status).toBe(200);
      expect(invRes.headers['content-type']).toContain('spreadsheetml');

      const worksRes = await request(app)
        .get('/api/exports/works')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(worksRes.status).toBe(200);
      expect(worksRes.headers['content-type']).toContain('spreadsheetml');
    });
  });
});
