import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CreateSaleHandler } from './CreateSaleHandler';
import { CancelSaleHandler } from './CancelSaleHandler';
import { Sale } from '../../../../models/Sale';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Unit } from '../../../../models/Unit';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';
import { User } from '../../../../models/User';
import { connectTestDb, clearTestDb, closeTestDb } from '../../../../tests/helpers/testDb';
import mongoose from 'mongoose';

describe('SaleHandlers', () => {
  const createHandler = new CreateSaleHandler();
  const cancelHandler = new CancelSaleHandler();

  let adminUser: any;
  let category: any;
  let subcategory: any;
  let unitPieces: any;
  let tubeItem: any;
  let toolItem: any;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
      role: 'admin',
    });

    unitPieces = await Unit.create({ name: 'Pieza', symbol: 'pz', allowsDecimals: false });
    category = await Category.create({ name: 'Ferretería' });
    subcategory = await Subcategory.create({ name: 'Varios', category: category._id, unit: unitPieces._id });

    tubeItem = await InventoryItem.create({
      name: 'Tubo Redondo 2"',
      subcategory: subcategory._id,
      kind: 'material',
      stock: 15,
      avgUnitCost: '20.00',
      isActive: true,
    });

    toolItem = await InventoryItem.create({
      name: 'Amoladora Angular',
      subcategory: subcategory._id,
      kind: 'tool',
      stock: 5,
      avgUnitCost: '50.00',
      isActive: true,
    });
  });

  it('creates a direct sale, deducts stock, and calculates financial metrics accurately', async () => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const sale = await createHandler.execute(
      {
        buyerName: 'Constructora Bolívar',
        notes: 'Pago en efectivo',
        items: [
          {
            item: tubeItem._id.toString(),
            quantity: 3,
            unitPrice: 35.0, // Selling price $35 (Cost $20)
          },
          {
            item: toolItem._id.toString(),
            quantity: 1,
            unitCost: 45.0, // Override unit cost $45
            unitPrice: 80.0, // Selling price $80
          },
        ],
      },
      adminUser._id.toString(),
      session
    );

    await session.commitTransaction();
    session.endSession();

    expect(sale).toBeDefined();
    expect(sale.buyerName).toBe('Constructora Bolívar');
    expect(sale.folio).toMatch(/^VTA-\d{4}$/);
    expect(sale.status).toBe('completed');
    expect(sale.items.length).toBe(2);

    // Item 1: 3 * 35 = 105 total price, 3 * 20 = 60 total cost, 45 profit
    // Item 2: 1 * 80 = 80 total price, 1 * 45 = 45 total cost, 35 profit
    // Total Amount = 185, Total Cost = 105, Profit = 80
    expect(sale.totalAmount.toString()).toBe('185');
    expect(sale.totalCost.toString()).toBe('105');
    expect(sale.profit.toString()).toBe('80');

    // Check inventory stock deducted
    const updatedTube = await InventoryItem.findById(tubeItem._id);
    expect(updatedTube?.stock.toString()).toBe('12'); // 15 - 3

    const updatedTool = await InventoryItem.findById(toolItem._id);
    expect(updatedTool?.stock.toString()).toBe('4'); // 5 - 1

    // Check movements recorded
    const movements = await InventoryMovement.find({ sale: sale._id });
    expect(movements.length).toBe(2);
    expect(movements[0].type).toBe('sale');
    expect(movements[0].quantity.toString()).toBe('-3');
  });

  it('rejects sale when requested quantity exceeds available stock', async () => {
    const session = await mongoose.startSession();
    session.startTransaction();

    await expect(
      createHandler.execute(
        {
          buyerName: 'Cliente X',
          items: [
            {
              item: toolItem._id.toString(),
              quantity: 10, // Available: 5
              unitPrice: 100,
            },
          ],
        },
        adminUser._id.toString(),
        session
      )
    ).rejects.toThrow(/Stock insuficiente/);

    await session.abortTransaction();
    session.endSession();

    // Verify stock remains untouched
    const tool = await InventoryItem.findById(toolItem._id);
    expect(tool?.stock.toString()).toBe('5');
  });

  it('cancels a sale, restores stock to inventory, and logs reversal movement', async () => {
    // 1. Create a sale first
    const session1 = await mongoose.startSession();
    session1.startTransaction();
    const sale = await createHandler.execute(
      {
        buyerName: 'Cliente Devolución',
        items: [
          {
            item: tubeItem._id.toString(),
            quantity: 5,
            unitPrice: 30,
          },
        ],
      },
      adminUser._id.toString(),
      session1
    );
    await session1.commitTransaction();
    session1.endSession();

    let tube = await InventoryItem.findById(tubeItem._id);
    expect(tube?.stock.toString()).toBe('10'); // 15 - 5

    // 2. Cancel sale
    const session2 = await mongoose.startSession();
    session2.startTransaction();
    const cancelledSale = await cancelHandler.execute(
      sale._id.toString(),
      'Cliente canceló el pedido en mostrador',
      adminUser._id.toString(),
      session2
    );
    await session2.commitTransaction();
    session2.endSession();

    expect(cancelledSale.status).toBe('cancelled');
    expect(cancelledSale.cancellationReason).toBe('Cliente canceló el pedido en mostrador');

    // 3. Stock restored
    tube = await InventoryItem.findById(tubeItem._id);
    expect(tube?.stock.toString()).toBe('15'); // 10 + 5 restored

    // 4. Reversal movement created
    const reversalMov = await InventoryMovement.findOne({ sale: sale._id, type: 'sale_reversal' });
    expect(reversalMov).toBeDefined();
    expect(reversalMov?.quantity.toString()).toBe('5');
  });

  it('CreateSaleApprovalHandler applies admin price overrides and formalizes sale', async () => {
    const { CreateSaleApprovalHandler } = await import('./CreateSaleApprovalHandler');
    const approvalHandler = new CreateSaleApprovalHandler();

    const mockRequest: any = {
      entity: 'sale',
      action: 'create',
      requestedBy: adminUser._id,
      payload: {
        buyerName: 'Cliente Aprobación',
        items: [
          {
            item: tubeItem._id.toString(),
            quantity: 4,
          },
        ],
      },
    };

    const session = await mongoose.startSession();
    session.startTransaction();

    const sale = await approvalHandler.apply(
      mockRequest,
      {
        items: [
          {
            item: tubeItem._id.toString(),
            unitPrice: 50.0,
          },
        ],
      },
      { actorId: adminUser._id.toString(), role: 'admin' },
      session
    );

    await session.commitTransaction();
    session.endSession();

    expect(sale).toBeDefined();
    expect(sale.buyerName).toBe('Cliente Aprobación');
    expect(sale.totalAmount.toString()).toBe('200'); // 4 * 50
    expect(sale.totalCost.toString()).toBe('80'); // 4 * 20
    expect(sale.profit.toString()).toBe('120');

    const updatedTube = await InventoryItem.findById(tubeItem._id);
    expect(updatedTube?.stock.toString()).toBe('11'); // 15 - 4
  });

  it('CancelSaleApprovalHandler restores stock when admin approves cancellation', async () => {
    const { CancelSaleApprovalHandler } = await import('./CancelSaleApprovalHandler');
    const cancelApprovalHandler = new CancelSaleApprovalHandler();

    // 1. Create sale
    const session1 = await mongoose.startSession();
    session1.startTransaction();
    const sale = await createHandler.execute(
      {
        buyerName: 'Cliente Cancel Approval',
        items: [
          {
            item: toolItem._id.toString(),
            quantity: 2,
            unitPrice: 100,
          },
        ],
      },
      adminUser._id.toString(),
      session1
    );
    await session1.commitTransaction();
    session1.endSession();

    let tool = await InventoryItem.findById(toolItem._id);
    expect(tool?.stock.toString()).toBe('3'); // 5 - 2

    // 2. Approve cancellation
    const mockRequest: any = {
      entity: 'sale',
      action: 'cancel',
      targetId: sale._id,
      requestedBy: adminUser._id,
      payload: {
        reason: 'Error en pedido',
      },
    };

    const session2 = await mongoose.startSession();
    session2.startTransaction();

    const cancelledSale = await cancelApprovalHandler.apply(
      mockRequest,
      {},
      { actorId: adminUser._id.toString(), role: 'admin' },
      session2
    );

    await session2.commitTransaction();
    session2.endSession();

    expect(cancelledSale.status).toBe('cancelled');
    tool = await InventoryItem.findById(toolItem._id);
    expect(tool?.stock.toString()).toBe('5'); // 3 + 2 restored
  });
});
