import { InventoryItem } from '../../../../models/InventoryItem';
import { Subcategory } from '../../../../models/Subcategory';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Unit } from '../../../../models/Unit';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class CreateItemHandler implements IChangeHandler {
  entity = 'inventoryItem';
  action = 'create';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;

    let kind = payload.kind;
    if (!kind && payload.subcategory) {
      const subcategoryDoc = await Subcategory.findById(payload.subcategory).session(tx);
      if (subcategoryDoc?.kind) {
        kind = subcategoryDoc.kind;
      }
    }
    if (!kind) {
      kind = 'material';
    }

    if (payload.pieceSpec) {
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
    }

    const item = new InventoryItem({
      ...payload,
      kind,
      stock: 0,
      avgUnitCost: 0,
    });
    await item.save({ session: tx });
    return item;
  }
}

changeHandlerRegistry.register(new CreateItemHandler());
