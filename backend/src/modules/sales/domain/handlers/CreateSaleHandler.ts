import { Decimal } from 'decimal.js';
import { Types } from 'mongoose';
import { Sale, ISale, ISaleItem } from '../../../../models/Sale';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { AuditLog } from '../../../../models/AuditLog';
import { CreateSaleInput } from '../../application/schemas/saleSchemas';

export class CreateSaleHandler {
  async execute(input: CreateSaleInput, actorId: string, session: any): Promise<ISale> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Debes incluir al menos un ítem en la venta');
    }

    let totalAmount = new Decimal(0);
    let totalCost = new Decimal(0);
    let totalProfit = new Decimal(0);

    const builtItems: ISaleItem[] = [];

    // Pre-flight check & deduction loop
    for (const line of input.items) {
      const itemDoc = await InventoryItem.findById(line.item).session(session);
      if (!itemDoc) {
        throw new Error(`El ítem con ID "${line.item}" no existe en el inventario`);
      }
      if (!itemDoc.isActive) {
        throw new Error(`El ítem "${itemDoc.name}" está desactivado`);
      }

      const currentStock = new Decimal(itemDoc.stock?.toString() || '0');
      const qty = new Decimal(line.quantity.toString());

      if (qty.lte(0)) {
        throw new Error(`La cantidad para "${itemDoc.name}" debe ser mayor a 0`);
      }

      if (qty.gt(currentStock)) {
        throw new Error(
          `Stock insuficiente para "${itemDoc.name}": disponibles ${currentStock.toString()}, solicitadas ${qty.toString()}`
        );
      }

      // Cost price: fallback to item's current avgUnitCost if not explicitly provided
      const unitCostSnapshot = line.unitCost !== undefined
        ? new Decimal(line.unitCost.toString())
        : new Decimal(itemDoc.avgUnitCost?.toString() || '0');

      const unitPrice = new Decimal(line.unitPrice.toString());
      if (unitPrice.lt(0)) {
        throw new Error(`El precio de venta para "${itemDoc.name}" no puede ser negativo`);
      }

      const subtotalCost = qty.mul(unitCostSnapshot);
      const subtotalPrice = qty.mul(unitPrice);
      const profit = subtotalPrice.sub(subtotalCost);

      // Deduct stock from inventory
      itemDoc.stock = currentStock.sub(qty).toString() as any;
      await itemDoc.save({ session });

      totalAmount = totalAmount.add(subtotalPrice);
      totalCost = totalCost.add(subtotalCost);
      totalProfit = totalProfit.add(profit);

      const rawUnit = (itemDoc.pieceSpec?.measureUnit as any)?.symbol || line.unitSymbol || (itemDoc.pieceSpec ? 'pz' : 'unid.');

      builtItems.push({
        item: itemDoc._id as any,
        name: itemDoc.name,
        kind: itemDoc.kind,
        unitSymbol: typeof rawUnit === 'object' ? (rawUnit.symbol || 'unid.') : rawUnit,
        quantity: qty.toString() as any,
        unitCostSnapshot: unitCostSnapshot.toString() as any,
        unitPrice: unitPrice.toString() as any,
        subtotalCost: subtotalCost.toString() as any,
        subtotalPrice: subtotalPrice.toString() as any,
        profit: profit.toString() as any,
      });
    }

    const profitMargin = totalAmount.gt(0)
      ? totalProfit.div(totalAmount).mul(100).toDecimalPlaces(2)
      : new Decimal(0);

    // Folio generation: VTA-XXXX
    const salesCount = await Sale.countDocuments().session(session);
    const folio = `VTA-${String(salesCount + 1).padStart(4, '0')}`;

    const [sale] = await Sale.create(
      [
        {
          folio,
          buyerName: input.buyerName.trim(),
          performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
          items: builtItems,
          totalAmount: totalAmount.toString(),
          totalCost: totalCost.toString(),
          profit: totalProfit.toString(),
          profitMargin: profitMargin.toString(),
          notes: input.notes?.trim() || '',
          status: 'completed',
          registeredBy: new Types.ObjectId(actorId),
        },
      ],
      { session }
    );

    // Record InventoryMovements
    for (const it of builtItems) {
      await InventoryMovement.create(
        [
          {
            item: it.item,
            type: 'sale',
            quantity: new Decimal(it.quantity.toString()).negated().toString(),
            unitCost: it.unitCostSnapshot.toString(),
            totalCost: it.subtotalCost.toString(),
            sale: sale._id,
            createdBy: new Types.ObjectId(actorId),
            approvedBy: new Types.ObjectId(actorId),
            note: `Venta ${folio} a ${input.buyerName.trim()}: ${it.quantity.toString()} ${it.unitSymbol || 'unid.'} a $${new Decimal(it.unitPrice.toString()).toFixed(2)}`,
          },
        ],
        { session }
      );
    }

    // Audit log
    await AuditLog.create(
      [
        {
          actor: new Types.ObjectId(actorId),
          action: 'sale.create',
          entity: 'sale',
          entityId: sale._id,
          after: {
            folio,
            buyerName: input.buyerName.trim(),
            totalAmount: totalAmount.toString(),
            totalCost: totalCost.toString(),
            profit: totalProfit.toString(),
            itemsCount: builtItems.length,
          },
        },
      ],
      { session }
    );

    return sale;
  }
}

export const createSaleHandler = new CreateSaleHandler();
