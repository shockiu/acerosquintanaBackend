import { Decimal } from 'decimal.js';
import { Work } from '../../../../models/Work';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class ReverseWorkHandler implements IChangeHandler {
  entity = 'work';
  action = 'delete';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const workId = request.targetId;
    const work = await Work.findById(workId).session(tx);
    if (!work) throw new Error('Obra no encontrada');
    if (work.status !== 'approved') {
      throw new Error(`Solo se pueden revertir obras aprobadas. Estado actual: ${work.status}`);
    }

    // P7: Validate that NO generated remnants have been consumed
    for (const item of work.items) {
      if (item.remnantsCreated && item.remnantsCreated.length > 0) {
        for (const remnantId of item.remnantsCreated) {
          const remnantDoc = await Remnant.findById(remnantId).session(tx);
          if (remnantDoc && remnantDoc.status !== 'available') {
            throw new Error(
              `Reversión bloqueada: El retazo generado por esta obra (${remnantDoc.measure.toString()} m) ya fue utilizado o descartado.`
            );
          }
        }
      }
    }

    // All safe, proceed with rollback
    for (const item of work.items) {
      const itemDoc = await InventoryItem.findById(item.item).session(tx);
      if (!itemDoc) continue;

      if (item.mode === 'pieces') {
        const qty = new Decimal(item.piecesConsumed?.toString() || item.quantity?.toString() || '0');
        const currentStock = new Decimal(itemDoc.stock.toString());
        itemDoc.stock = currentStock.add(qty).toString() as any;
        await itemDoc.save({ session: tx });

        await InventoryMovement.create([{
          item: itemDoc._id,
          type: 'work_reversal',
          quantity: qty.toString(),
          work: work._id,
          createdBy: request.requestedBy,
          approvedBy: ctx.actorId,
          note: `Reversión de obra: reincorporación de ${qty.toString()} pieza(s)`,
        }], { session: tx });

      } else if (item.mode === 'measure' && item.source === 'whole_piece') {
        const qty = new Decimal(item.piecesConsumed?.toString() || '1');
        const currentStock = new Decimal(itemDoc.stock.toString());
        itemDoc.stock = currentStock.add(qty).toString() as any;
        await itemDoc.save({ session: tx });

        // Invalidate created remnants
        if (item.remnantsCreated && item.remnantsCreated.length > 0) {
          for (const remnantId of item.remnantsCreated) {
            await Remnant.findByIdAndUpdate(remnantId, { status: 'discarded' }, { session: tx });
          }
        }

        await InventoryMovement.create([{
          item: itemDoc._id,
          type: 'work_reversal',
          quantity: qty.toString(),
          work: work._id,
          createdBy: request.requestedBy,
          approvedBy: ctx.actorId,
          note: `Reversión de obra: reincorporación de ${qty.toString()} pieza(s) entera(s)`,
        }], { session: tx });

      } else if (item.mode === 'measure' && item.source === 'remnant') {
        // Invalidate child remnants created
        if (item.remnantsCreated && item.remnantsCreated.length > 0) {
          for (const remnantId of item.remnantsCreated) {
            await Remnant.findByIdAndUpdate(remnantId, { status: 'discarded' }, { session: tx });
          }
        }

        // Restore original remnant to available
        if (item.remnant) {
          await Remnant.findByIdAndUpdate(item.remnant, { status: 'available', usedInWork: null }, { session: tx });
        }

        await InventoryMovement.create([{
          item: itemDoc._id,
          type: 'work_reversal',
          quantity: '0',
          work: work._id,
          createdBy: request.requestedBy,
          approvedBy: ctx.actorId,
          note: `Reversión de obra: restauración de retazo original a disponible`,
        }], { session: tx });

      } else if (item.kind === 'tool') {
        // Tools: only written-off units ever left stock
        const lost = new Decimal(item.lostQuantity?.toString() || '0');
        if (lost.gt(0)) {
          const currentStock = new Decimal(itemDoc.stock.toString());
          itemDoc.stock = currentStock.add(lost).toString() as any;
          await itemDoc.save({ session: tx });

          await InventoryMovement.create([{
            item: itemDoc._id,
            type: 'work_reversal',
            quantity: lost.toString(),
            work: work._id,
            createdBy: request.requestedBy,
            approvedBy: ctx.actorId,
            note: `Reversión de obra: reincorporación de ${lost.toString()} herramienta(s) dada(s) de baja`,
          }], { session: tx });
        }

      } else if (item.kind === 'material') {
        // Legacy material
        const qty = new Decimal(item.quantity?.toString() || '0');
        const currentStock = new Decimal(itemDoc.stock.toString());
        itemDoc.stock = currentStock.add(qty).toString() as any;
        await itemDoc.save({ session: tx });

        await InventoryMovement.create([{
          item: itemDoc._id,
          type: 'work_reversal',
          quantity: qty.toString(),
          work: work._id,
          createdBy: request.requestedBy,
          approvedBy: ctx.actorId,
        }], { session: tx });
      }
    }

    work.status = 'rejected';
    await work.save({ session: tx });
    return work;
  }
}

changeHandlerRegistry.register(new ReverseWorkHandler());
