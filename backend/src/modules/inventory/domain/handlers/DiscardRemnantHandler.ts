import { Remnant } from '../../../../models/Remnant';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class DiscardRemnantHandler implements IChangeHandler {
  entity = 'remnant';
  action = 'discard';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const remnantId = request.targetId;
    const note = request.payload?.note || 'Descarte manual de retazo';

    const remnant = await Remnant.findOneAndUpdate(
      { _id: remnantId, status: 'available' },
      { $set: { status: 'discarded', approvedBy: ctx.actorId } },
      { new: true, session: tx }
    );

    if (!remnant) {
      throw new Error('El retazo no fue encontrado o no está disponible para descarte');
    }

    const movement = new InventoryMovement({
      item: remnant.item,
      type: 'waste',
      quantity: '0',
      measureUsed: remnant.measure.toString(),
      totalCost: (
        Number(remnant.measure.toString()) * Number(remnant.costPerMeasureSnapshot.toString())
      ).toString(),
      remnant: remnant._id,
      createdBy: request.requestedBy,
      approvedBy: ctx.actorId,
      note,
    });

    await movement.save({ session: tx });
    return remnant;
  }
}

changeHandlerRegistry.register(new DiscardRemnantHandler());
