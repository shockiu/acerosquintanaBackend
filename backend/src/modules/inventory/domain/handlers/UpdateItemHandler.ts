import Decimal from 'decimal.js';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Subcategory } from '../../../../models/Subcategory';
import { Unit } from '../../../../models/Unit';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class UpdateItemHandler implements IChangeHandler {
  entity = 'inventoryItem';
  action = 'update';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    const itemId = request.targetId;

    if (!itemId) {
      throw new Error('targetId is required to update an inventory item');
    }

    const item = await InventoryItem.findById(itemId).session(tx);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    let kind = payload.kind !== undefined ? payload.kind : item.kind;
    if (payload.subcategory && payload.kind === undefined) {
      const subcategoryDoc = await Subcategory.findById(payload.subcategory).session(tx);
      if (subcategoryDoc?.kind) {
        kind = subcategoryDoc.kind;
      }
    }

    if (payload.pieceSpec !== undefined) {
      if (payload.pieceSpec === null) {
        item.pieceSpec = undefined;
      } else {
        if (kind !== 'material') {
          throw new Error('pieceSpec is only allowed for materials');
        }
        const unit = await Unit.findById(payload.pieceSpec.measureUnit).session(tx);
        if (!unit) throw new Error('pieceSpec.measureUnit does not exist');
        if (!unit.allowsDecimals) {
          const { pieceSize, minUsableMeasure } = payload.pieceSpec;
          if (!Number.isInteger(pieceSize) || (minUsableMeasure !== undefined && !Number.isInteger(minUsableMeasure))) {
            throw new Error(`Unit "${unit.name}" does not allow decimals`);
          }
        }
        item.pieceSpec = payload.pieceSpec;
      }
    } else if (kind === 'tool' && item.pieceSpec) {
      // If changed to tool, pieceSpec is not allowed
      item.pieceSpec = undefined;
    }

    if (payload.name !== undefined) item.name = payload.name;
    if (payload.description !== undefined) item.description = payload.description;
    if (payload.subcategory !== undefined) item.subcategory = payload.subcategory;
    if (payload.isActive !== undefined) item.isActive = payload.isActive;
    item.kind = kind;

    // Adjust quantities / stock
    if (payload.stock !== undefined) {
      const newStock = new Decimal(payload.stock.toString());
      if (newStock.isNegative()) {
        throw new Error('El stock no puede ser negativo');
      }
      const oldStock = new Decimal(item.stock ? item.stock.toString() : '0');
      if (!newStock.equals(oldStock)) {
        item.stock = newStock.toString() as any;
        const diff = newStock.sub(oldStock);
        const movement = new InventoryMovement({
          item: item._id,
          type: 'adjustment',
          quantity: diff.abs().toString(),
          note:
            payload.adjustmentReason ||
            (diff.isNegative()
              ? `Ajuste manual de reducción: de ${oldStock.toString()} a ${newStock.toString()}`
              : `Ajuste manual de incremento: de ${oldStock.toString()} a ${newStock.toString()}`),
          createdBy: request.requestedBy || ctx.actorId,
          approvedBy: ctx.role === 'admin' ? ctx.actorId : request.approvedBy,
        });
        await movement.save({ session: tx });
      }
    }

    // Optionally discard existing available remnants
    if (payload.clearRemnants) {
      const availableRemnants = await Remnant.find({
        item: item._id,
        status: 'available',
      }).session(tx);

      for (const rem of availableRemnants) {
        rem.status = 'discarded';
        rem.approvedBy = ctx.actorId as any;
        await rem.save({ session: tx });

        const wasteMovement = new InventoryMovement({
          item: item._id,
          type: 'waste',
          quantity: '0',
          measureUsed: rem.measure.toString(),
          totalCost: (
            Number(rem.measure.toString()) * Number(rem.costPerMeasureSnapshot.toString())
          ).toString(),
          remnant: rem._id,
          createdBy: request.requestedBy || ctx.actorId,
          approvedBy: ctx.actorId,
          note: payload.adjustmentReason || 'Descarte de retazo por ajuste/eliminación de existencias',
        });
        await wasteMovement.save({ session: tx });
      }
    }

    // Adjust unit cost if provided
    if (payload.avgUnitCost !== undefined) {
      const newCost = new Decimal(payload.avgUnitCost.toString());
      if (newCost.isNegative()) {
        throw new Error('El costo unitario no puede ser negativo');
      }
      item.avgUnitCost = newCost.toString() as any;
    }

    await item.save({ session: tx });
    return item;
  }
}

changeHandlerRegistry.register(new UpdateItemHandler());
