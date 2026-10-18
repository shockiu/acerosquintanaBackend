import { IChangeRequest } from '../../../../models/ChangeRequest';
import { IChangeHandler, ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { createSaleHandler } from './CreateSaleHandler';

export class CreateSaleApprovalHandler implements IChangeHandler {
  entity = 'sale';
  action = 'create';

  async apply(request: IChangeRequest, overrides: any, ctx: ActionContext, tx: any) {
    const payload = request.payload;

    // Overrides supplied by the admin (e.g. { items: [{ item: '...', unitPrice: 50 }] })
    const priceMap = new Map<string, number>();
    if (Array.isArray(overrides?.items)) {
      for (const ov of overrides.items) {
        if (ov.item && ov.unitPrice !== undefined) {
          priceMap.set(ov.item.toString(), Number(ov.unitPrice));
        }
      }
    }

    const items = (payload.items || []).map((it: any) => {
      const overridePrice = priceMap.get(it.item?.toString());
      const resolvedPrice = overridePrice !== undefined ? overridePrice : (it.unitPrice ?? 0);

      if (resolvedPrice <= 0) {
        throw new Error(`Debes asignar un precio de venta válido (mayor a 0) para el ítem "${it.name || 'solicitado'}"`);
      }

      return {
        ...it,
        unitPrice: resolvedPrice,
      };
    });

    const input = {
      buyerName: payload.buyerName || 'Cliente General',
      performedAt: payload.performedAt,
      notes: payload.notes,
      items,
    };

    return await createSaleHandler.execute(input, ctx.actorId, tx);
  }
}

changeHandlerRegistry.register(new CreateSaleApprovalHandler());
