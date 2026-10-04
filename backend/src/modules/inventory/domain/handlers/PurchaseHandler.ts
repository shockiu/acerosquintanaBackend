import { Decimal } from 'decimal.js';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class PurchaseHandler implements IChangeHandler {
  entity = 'inventoryMovement';
  action = 'purchase';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    const itemId = request.targetId;
    const quantity = new Decimal(payload.quantity);

    let unitCost: Decimal;
    let totalCost: Decimal;

    // Overrides happen when admin approves and adds/changes the cost
    const effectiveUnitCost = overrides?.unitCost !== undefined ? overrides.unitCost : payload.unitCost;
    const effectiveTotalCost = overrides?.totalCost !== undefined ? overrides.totalCost : payload.totalCost;

    if (effectiveUnitCost !== undefined && effectiveUnitCost !== null) {
      unitCost = new Decimal(effectiveUnitCost);
      totalCost = unitCost.mul(quantity);
    } else if (effectiveTotalCost !== undefined && effectiveTotalCost !== null) {
      totalCost = new Decimal(effectiveTotalCost);
      unitCost = totalCost.div(quantity);
    } else {
      throw new Error('Purchase must have either unitCost or totalCost');
    }

    const item = await InventoryItem.findById(itemId).session(tx);
    if (!item) throw new Error('Item not found');

    const currentStock = new Decimal(item.stock.toString());
    const currentCost = new Decimal(item.avgUnitCost.toString());

    // Weighted average cost formula (R4)
    // newCost = (stock*currentCost + quantity*unitCost) / (stock + quantity)
    let newAvgCost = currentCost;
    if (item.kind === 'material') {
      const currentTotalValue = currentStock.mul(currentCost);
      const newTotalValue = currentTotalValue.add(totalCost);
      const newTotalStock = currentStock.add(quantity);
      newAvgCost = newTotalValue.div(newTotalStock);
    }

    const movement = new InventoryMovement({
      item: itemId,
      type: 'purchase',
      quantity: quantity.toString(),
      unitCost: unitCost.toString(),
      totalCost: totalCost.toString(),
      createdBy: request.requestedBy,
      approvedBy: ctx.actorId,
      note: payload.note || '',
    });

    await movement.save({ session: tx });

    item.stock = currentStock.add(quantity) as any;
    item.avgUnitCost = newAvgCost as any;
    await item.save({ session: tx });

    return movement;
  }
}

changeHandlerRegistry.register(new PurchaseHandler());
