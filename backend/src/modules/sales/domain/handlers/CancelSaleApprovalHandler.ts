import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { cancelSaleHandler } from './CancelSaleHandler';

export class CancelSaleApprovalHandler implements IChangeHandler {
  entity = 'sale';
  action = 'cancel';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const saleId = request.targetId?.toString();
    if (!saleId) {
      throw new Error('targetId es requerido para anular una venta');
    }

    const reason = overrides?.reason || request.payload?.reason || 'Anulación aprobada por administrador';
    return await cancelSaleHandler.execute(saleId, reason, ctx.actorId, tx);
  }
}

changeHandlerRegistry.register(new CancelSaleApprovalHandler());
