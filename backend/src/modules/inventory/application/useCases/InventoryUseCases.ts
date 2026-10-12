import { Decimal } from 'decimal.js';
import { InventoryItem } from '../../../../models/InventoryItem';
import { InventoryMovement } from '../../../../models/InventoryMovement';
import { Remnant } from '../../../../models/Remnant';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class InventoryUseCases {
  static async listItems(filters: any, page?: number, limit?: number) {
    const query: any = {};
    if (filters.subcategory) query.subcategory = filters.subcategory;
    if (filters.kind) query.kind = filters.kind;
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    let itemsQuery = InventoryItem.find(query)
      .populate('subcategory')
      .populate('pieceSpec.measureUnit')
      .sort({ name: 1 });

    let total = 0;
    if (page && limit) {
      const skip = (page - 1) * limit;
      total = await InventoryItem.countDocuments(query);
      itemsQuery = itemsQuery.skip(skip).limit(limit) as any;
    }

    const items = await itemsQuery.lean();

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

    if (page && limit) {
      return {
        items: enriched,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

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
    let targetName: string | undefined;
    let itemName = 'Material';
    let measure = 0;
    try {
      const remnant = await Remnant.findById(remnantId).populate('item', 'name').lean();
      if (remnant) {
        itemName = (remnant.item as any)?.name || 'Material';
        measure = Number(remnant.measure?.toString() || 0);
        targetName = `${itemName} (${measure}m)`;
      }
    } catch {
      // ignore
    }
    const payload = { note, itemName, measure };
    return this.executeOrRequest('remnant', 'discard', payload, ctx, remnantId, targetName);
  }

  static async executeOrRequest(entity: string, action: string, payload: any, ctx: ActionContext, targetId?: string, targetName?: string) {
    if (ctx.role === 'user') {
      // Create pending request
      if (action === 'purchase' && (payload.unitCost !== undefined || payload.totalCost !== undefined)) {
        // Security: Strip prices if user attempts to send them (R3 rule enforced here)
        delete payload.unitCost;
        delete payload.totalCost;
      }
      return ApprovalUseCases.submitRequest({ entity, action, targetId, targetName, payload }, ctx);
    } else {
      // Admin: Apply directly (create pseudo-request internally to pass to handler, then approve)
      const requestData = {
        entity,
        action,
        targetId,
        targetName,
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

  static async updateItem(itemId: string, data: any, ctx: ActionContext) {
    let targetName: string | undefined;
    try {
      const existingItem = await InventoryItem.findById(itemId).select('name kind subcategory').lean();
      if (existingItem) {
        targetName = existingItem.name;
        if (!data.name) data.name = existingItem.name;
        data.itemName = existingItem.name;
      }
    } catch {
      // ignore
    }
    return this.executeOrRequest('inventoryItem', 'update', data, ctx, itemId, targetName);
  }

  static async registerPurchase(itemId: string, data: any, ctx: ActionContext) {
    let targetName: string | undefined;
    try {
      const existingItem = await InventoryItem.findById(itemId).select('name').lean();
      if (existingItem) {
        targetName = existingItem.name;
        if (!data.name) data.name = existingItem.name;
        data.itemName = existingItem.name;
      }
    } catch {
      // ignore
    }
    return this.executeOrRequest('inventoryMovement', 'purchase', data, ctx, itemId, targetName);
  }
}

