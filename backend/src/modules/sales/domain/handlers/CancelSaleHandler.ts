import { Decimal } from 'decimal.js';
import { Types } from 'mongoose';
import { Sale, ISale } from '../../../../models/Sale';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { AuditLog } from '../../../../models/AuditLog';

export class CancelSaleHandler {
  async execute(saleId: string, reason: string, actorId: string, session: any): Promise<ISale> {
    const sale = await Sale.findById(saleId).session(session);
    if (!sale) {
      throw new Error(`La venta con ID "${saleId}" no existe`);
    }

    if (sale.status === 'cancelled') {
      throw new Error(`La venta ${sale.folio || sale._id} ya fue anulada previamente`);
    }

    // Revert inventory stock
    for (const it of sale.items) {
      const itemDoc = await InventoryItem.findById(it.item).session(session);
      if (itemDoc) {
        const currentStock = new Decimal(itemDoc.stock?.toString() || '0');
        const qty = new Decimal(it.quantity.toString());

        itemDoc.stock = currentStock.add(qty).toString() as any;
        await itemDoc.save({ session });

        await InventoryMovement.create(
          [
            {
              item: itemDoc._id,
              type: 'sale_reversal',
              quantity: qty.toString(),
              unitCost: it.unitCostSnapshot.toString(),
              totalCost: it.subtotalCost.toString(),
              sale: sale._id,
              createdBy: new Types.ObjectId(actorId),
              approvedBy: new Types.ObjectId(actorId),
              note: `Anulación de venta ${sale.folio || ''}: ${reason}`,
            },
          ],
          { session }
        );
      }
    }

    const previousStatus = sale.status;
    sale.status = 'cancelled';
    sale.cancelledBy = new Types.ObjectId(actorId);
    sale.cancelledAt = new Date();
    sale.cancellationReason = reason.trim();
    await sale.save({ session });

    await AuditLog.create(
      [
        {
          actor: new Types.ObjectId(actorId),
          action: 'sale.cancel',
          entity: 'sale',
          entityId: sale._id,
          before: { status: previousStatus },
          after: {
            status: 'cancelled',
            reason: reason.trim(),
            cancelledAt: sale.cancelledAt,
          },
        },
      ],
      { session }
    );

    return sale;
  }
}

export const cancelSaleHandler = new CancelSaleHandler();
