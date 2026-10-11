import { Decimal } from 'decimal.js';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class InventoryUseCases {
  static async listItems(filters: any) {
    const query: any = {};
    if (filters.subcategory) query.subcategory = filters.subcategory;
    if (filters.kind) query.kind = filters.kind;

    const items = await InventoryItem.find(query)
      .populate('subcategory')
      .populate('pieceSpec.measureUnit')
      .sort({ name: 1 })
      .lean();

    // Enrich items with piece tracking metrics
    const enriched = await Promise.all(
      items.map(async (item: any) => {
        if (!item.pieceSpec) {
          return item;
        }

        const availableRemnants = await Remnant.find({
          item: item._id,
          status: 'available',
        }).lean();

        const wholePieces = new Decimal(item.stock?.toString() || '0');
        const pieceSize = new Decimal(item.pieceSpec.pieceSize?.toString() || '0');
        const avgUnitCost = new Decimal(item.avgUnitCost?.toString() || '0');

        const availableRemnantsMeasure = availableRemnants.reduce((acc, r: any) => {
          return acc.add(new Decimal(r.measure?.toString() || '0'));
        }, new Decimal(0));

        const remnantsValue = availableRemnants.reduce((acc, r: any) => {
          const m = new Decimal(r.measure?.toString() || '0');
          const costPerM = new Decimal(r.costPerMeasureSnapshot?.toString() || '0');
          return acc.add(m.mul(costPerM));
        }, new Decimal(0));

        const totalMeasure = wholePieces.mul(pieceSize).add(availableRemnantsMeasure);
        const inventoryValue = wholePieces.mul(avgUnitCost).add(remnantsValue);

        return {
          ...item,
          wholePieces: wholePieces.toNumber(),
          availableRemnantsCount: availableRemnants.length,
          availableRemnantsMeasure: availableRemnantsMeasure.toNumber(),
          totalMeasure: totalMeasure.toNumber(),
          inventoryValue: inventoryValue.toNumber(),
        };
      })
    );

    return enriched;
  }

  static async getItemRemnants(itemId: string, status?: string) {
    const query: any = { item: itemId };
    if (status) query.status = status;

    return Remnant.find(query)
      .populate('originWork', 'clientName performedAt')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async discardRemnant(remnantId: string, note: string | undefined, ctx: ActionContext) {
    return this.executeOrRequest('remnant', 'discard', { note }, ctx, remnantId);
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
      const requestData = {
        entity,
        action,
        targetId,
        payload,
        status: 'approved',
        requestedBy: ctx.actorId,
        reviewedBy: ctx.actorId,
        reviewedAt: new Date(),
      };
      return uow.runInTransaction(async (tx) => {
        const handler = changeHandlerRegistry.get(entity, action);
        const result = await handler.apply(requestData as any, {}, ctx, tx);

        // Audit log for direct application
        const { auditLogger } = await import('../../../audit/infrastructure/persistence/AuditLogger');
        await auditLogger.log({
          actor: ctx.actorId,
          action: `${entity}.${action}.direct`,
          entity,
          entityId: result._id?.toString() || targetId,
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
