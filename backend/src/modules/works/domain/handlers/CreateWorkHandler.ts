import { Decimal } from 'decimal.js';
import { Work } from '../../../../models/Work';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class CreateWorkHandler implements IChangeHandler {
  entity = 'work';
  action = 'create';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    
    // Admin can override chargedPrice when approving
    const finalChargedPrice = overrides?.chargedPrice !== undefined ? overrides.chargedPrice : payload.chargedPrice;

    // Build the work document
    const work = new Work({
      clientName: payload.clientName,
      description: payload.description,
      performedAt: new Date(payload.performedAt),
      chargedPrice: finalChargedPrice,
      status: 'approved',
      createdBy: request.requestedBy,
      approvedBy: ctx.actorId,
    });

    let totalMaterialsCost = new Decimal(0);
    const workItems = [];

    // Process items (subtract stock, calculate costs)
    if (payload.items && payload.items.length > 0) {
      for (const i of payload.items) {
        const itemDoc = await InventoryItem.findById(i.item).session(tx);
        if (!itemDoc) throw new Error(`Item ${i.item} not found`);

        const quantity = new Decimal(i.quantity);
        const currentStock = new Decimal(itemDoc.stock.toString());
        const avgCost = new Decimal(itemDoc.avgUnitCost.toString());

        if (itemDoc.kind === 'material') {
          if (currentStock.lt(quantity)) {
            throw new Error(`Insufficient stock for material: ${itemDoc.name}`);
          }
          
          const subtotal = quantity.mul(avgCost);
          totalMaterialsCost = totalMaterialsCost.add(subtotal);

          workItems.push({
            item: itemDoc._id,
            kind: itemDoc.kind,
            quantity: quantity.toString(),
            unitCostSnapshot: avgCost.toString(),
            subtotal: subtotal.toString(),
          });

          // Deduct stock
          itemDoc.stock = currentStock.sub(quantity) as any;
          await itemDoc.save({ session: tx });

          // Create consumption movement
          await InventoryMovement.create([{
            item: itemDoc._id,
            type: 'work_consumption',
            quantity: quantity.negated().toString(),
            work: work._id,
            createdBy: request.requestedBy,
            approvedBy: ctx.actorId,
          }], { session: tx });

        } else {
          // It's a tool: don't deduct stock, don't add to cost
          workItems.push({
            item: itemDoc._id,
            kind: itemDoc.kind,
            quantity: quantity.toString(),
          });
        }
      }
    }

    work.items = workItems as any;
    work.materialsCost = totalMaterialsCost.toString() as any;
    
    if (finalChargedPrice !== undefined) {
      work.profit = new Decimal(finalChargedPrice).sub(totalMaterialsCost).toString() as any;
    }

    await work.save({ session: tx });
    return work;
  }
}

changeHandlerRegistry.register(new CreateWorkHandler());
