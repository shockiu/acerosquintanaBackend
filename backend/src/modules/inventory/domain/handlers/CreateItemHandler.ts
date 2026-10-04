import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';

export class CreateItemHandler implements IChangeHandler {
  entity = 'inventoryItem';
  action = 'create';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;
    const item = new InventoryItem({
      ...payload,
      stock: 0,
      avgUnitCost: 0,
    });
    await item.save({ session: tx });
    return item;
  }
}

changeHandlerRegistry.register(new CreateItemHandler());
