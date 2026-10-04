import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class InventoryUseCases {
  static async listItems(filters: any) {
    const query: any = {};
    if (filters.subcategory) query.subcategory = filters.subcategory;
    if (filters.kind) query.kind = filters.kind;
    
    return InventoryItem.find(query).populate('subcategory').sort({ name: 1 });
  }

  static async executeOrRequest(entity: string, action: string, payload: any, ctx: ActionContext, targetId?: string) {
    if (ctx.role === 'user') {
      // Create pending request
      if (action === 'purchase' && (payload.unitCost !== undefined || payload.totalCost !== undefined)) {
         // Security: Strip prices if user attempts to send them (R3 rule enforced here)
         delete payload.unitCost;
         delete payload.totalCost;
      }
      return ApprovalUseCases.submitRequest({ entity, action, targetId, payload }, ctx);
    } else {
      // Admin: Apply directly (create pseudo-request internally to pass to handler, then approve)
      const requestData = { entity, action, targetId, payload, status: 'approved', requestedBy: ctx.actorId, reviewedBy: ctx.actorId, reviewedAt: new Date() };
      return uow.runInTransaction(async (tx) => {
        const handler = changeHandlerRegistry.get(entity, action);
        const result = await handler.apply(requestData as any, {}, ctx, tx);
        
        // Audit log for direct application
        const { auditLogger } = await import('../../../audit/infrastructure/persistence/AuditLogger');
        await auditLogger.log({
          actor: ctx.actorId,
          action: `inventory.${action}.direct`,
          entity,
          entityId: result._id?.toString(),
          after: result,
          ip: ctx.ip,
        }, tx);
        
        return result;
      });
    }
  }

  static async createItem(data: any, ctx: ActionContext) {
    return this.executeOrRequest('inventoryItem', 'create', data, ctx);
  }

  static async registerPurchase(itemId: string, data: any, ctx: ActionContext) {
    return this.executeOrRequest('inventoryMovement', 'purchase', data, ctx, itemId);
  }
}
