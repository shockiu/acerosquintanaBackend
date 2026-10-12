import { ChangeRequest } from '../../../../models/ChangeRequest';
import { changeHandlerRegistry } from '../../domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';
import { auditLogger } from '../../../audit/infrastructure/persistence/AuditLogger';
import { ActionContext } from '../../domain/IChangeHandler';
import { InventoryItem } from '../../../../models/InventoryItem';
import { Work } from '../../../../models/Work';
import { Remnant } from '../../../../models/Remnant';
import { Category } from '../../../../models/Category';
import { Subcategory } from '../../../../models/Subcategory';

export class ApprovalUseCases {
  static async listPending(filters?: any, page?: number, limit?: number) {
    const query: any = { status: 'pending' };
    if (filters?.entity) query.entity = filters.entity;

    let reqQuery = ChangeRequest.find(query).populate('requestedBy', 'name email').sort({ createdAt: -1 });
    let total = 0;

    if (page && limit) {
      const skip = (page - 1) * limit;
      total = await ChangeRequest.countDocuments(query);
      reqQuery = reqQuery.skip(skip).limit(limit) as any;
    }

    const rawRequests = await reqQuery.lean();

    // Enrich requests with human-readable target details so the UI never displays raw Mongo ObjectIds
    const requests = await Promise.all(
      rawRequests.map(async (req: any) => {
        let targetName = req.targetName || '';
        let targetDoc: any = null;
        const payload = req.payload ? { ...req.payload } : {};

        if (req.targetId) {
          try {
            if (req.entity === 'inventoryItem' || req.entity === 'inventoryMovement') {
              const item = await InventoryItem.findById(req.targetId)
                .select('name kind pieceSpec subcategory')
                .populate('subcategory', 'name')
                .lean();
              if (item) {
                targetName = targetName || item.name;
                targetDoc = {
                  name: item.name,
                  kind: item.kind,
                  subcategory: (item.subcategory as any)?.name,
                };
                if (!payload.name) payload.name = item.name;
                if (!payload.itemName) payload.itemName = item.name;
              }
            } else if (req.entity === 'work') {
              const work = await Work.findById(req.targetId)
                .select('clientName description totalCost materialsCost wasteCost chargedPrice profit performedAt createdAt items waste')
                .populate('items.item', 'name description pieceSpec kind')
                .populate('waste.item', 'name')
                .populate('waste.subcategory', 'name')
                .populate('waste.measureUnit', 'symbol')
                .lean();
              if (work) {
                const toVal = (v: any) => {
                  if (v === null || v === undefined) return undefined;
                  if (typeof v === 'object' && '$numberDecimal' in v) return v.$numberDecimal.toString();
                  return v.toString();
                };

                const chargedPriceVal = toVal(work.chargedPrice);
                const materialsCostVal = toVal(work.materialsCost || work.totalCost);
                const wasteCostVal = toVal(work.wasteCost);
                const profitVal = toVal(work.profit);

                targetName = targetName || (work.clientName ? `${work.clientName} - ${work.description}` : work.description);
                targetDoc = {
                  ...work,
                  clientName: work.clientName,
                  description: work.description,
                  chargedPrice: chargedPriceVal,
                  materialsCost: materialsCostVal,
                  wasteCost: wasteCostVal,
                  totalCost: materialsCostVal,
                  profit: profitVal,
                  createdAt: work.createdAt,
                  items: (work.items || []).map((it: any) => ({
                    ...it,
                    quantity: toVal(it.quantity),
                    piecesConsumed: toVal(it.piecesConsumed),
                    measureUsed: toVal(it.measureUsed),
                    subtotal: toVal(it.subtotal),
                    unitSymbol: (it.item?.pieceSpec?.measureUnit as any)?.symbol || 'm',
                  })),
                  waste: (work.waste || []).map((w: any) => ({
                    ...w,
                    measure: toVal(w.measure),
                    cost: toVal(w.cost),
                  })),
                };
                if (!payload.clientName) payload.clientName = work.clientName;
                if (!payload.description) payload.description = work.description;
                if (!payload.items && targetDoc.items) payload.items = targetDoc.items;
                if (!payload.waste && targetDoc.waste) payload.waste = targetDoc.waste;
                if (payload.chargedPrice === undefined && chargedPriceVal) payload.chargedPrice = chargedPriceVal;
                if (payload.materialsCost === undefined && materialsCostVal) payload.materialsCost = materialsCostVal;
                if (payload.wasteCost === undefined && wasteCostVal) payload.wasteCost = wasteCostVal;
                if (payload.profit === undefined && profitVal) payload.profit = profitVal;
              }
            } else if (req.entity === 'remnant') {
              const remnant = await Remnant.findById(req.targetId)
                .populate({ path: 'item', select: 'name' })
                .select('measure code')
                .lean();
              if (remnant) {
                const itemName = (remnant.item as any)?.name || 'Material';
                targetName = targetName || `${itemName} (${remnant.measure}m)`;
                targetDoc = {
                  itemName,
                  measure: remnant.measure,
                  code: remnant.code,
                };
                if (!payload.itemName) payload.itemName = itemName;
              }
            } else if (req.entity === 'category') {
              const cat = await Category.findById(req.targetId).select('name').lean();
              if (cat) {
                targetName = targetName || cat.name;
                targetDoc = { name: cat.name };
                if (!payload.name) payload.name = cat.name;
              }
            } else if (req.entity === 'subcategory') {
              const sub = await Subcategory.findById(req.targetId).select('name').lean();
              if (sub) {
                targetName = targetName || sub.name;
                targetDoc = { name: sub.name };
                if (!payload.name) payload.name = sub.name;
              }
            }
          } catch {
            // Keep existing values on lookup error
          }
        }

        if (req.entity === 'work' && !targetName && payload.clientName) {
          targetName = payload.description ? `${payload.clientName} - ${payload.description}` : payload.clientName;
        }

        return {
          ...req,
          payload,
          targetName,
          targetDoc,
        };
      })
    );

    if (page && limit) {
      return {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    return requests;
  }

  static async submitRequest(data: { entity: string, action: string, targetId?: string, targetName?: string, payload: any }, ctx: ActionContext) {
    let targetName = data.targetName;
    const payload = data.payload ? { ...data.payload } : {};

    if (data.targetId) {
      try {
        if (data.entity === 'inventoryItem' || data.entity === 'inventoryMovement') {
          const item = await InventoryItem.findById(data.targetId).select('name').lean();
          if (item) {
            targetName = targetName || item.name;
            if (!payload.name) payload.name = item.name;
            if (!payload.itemName) payload.itemName = item.name;
          }
        } else if (data.entity === 'work') {
          const work = await Work.findById(data.targetId).select('clientName description').lean();
          if (work) {
            targetName = targetName || (work.clientName ? `${work.clientName} - ${work.description}` : work.description);
            if (!payload.clientName) payload.clientName = work.clientName;
            if (!payload.description) payload.description = work.description;
          }
        } else if (data.entity === 'remnant') {
          const remnant = await Remnant.findById(data.targetId).populate({ path: 'item', select: 'name' }).select('measure').lean();
          if (remnant) {
            const matName = (remnant.item as any)?.name || 'Material';
            targetName = targetName || `${matName} (${remnant.measure}m)`;
            if (!payload.itemName) payload.itemName = matName;
            if (!payload.measure) payload.measure = remnant.measure;
          }
        } else if (data.entity === 'category') {
          const cat = await Category.findById(data.targetId).select('name').lean();
          if (cat) {
            targetName = targetName || cat.name;
            if (!payload.name) payload.name = cat.name;
          }
        } else if (data.entity === 'subcategory') {
          const sub = await Subcategory.findById(data.targetId).select('name').lean();
          if (sub) {
            targetName = targetName || sub.name;
            if (!payload.name) payload.name = sub.name;
          }
        }
      } catch {
        // Ignore
      }
    }

    if (data.entity === 'work' && !targetName && payload.clientName) {
      targetName = payload.description ? `${payload.clientName} - ${payload.description}` : payload.clientName;
    }

    return ChangeRequest.create({
      ...data,
      payload,
      targetName,
      entity: data.entity as any,
      action: data.action as any,
      requestedBy: ctx.actorId,
    });
  }

  static async approve(id: string, overrides: any, ctx: ActionContext) {
    return uow.runInTransaction(async (tx) => {
      // Find and update in one atomic operation to prevent double approval
      const request = await ChangeRequest.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { 
          $set: { 
            status: 'approved', 
            reviewedBy: ctx.actorId, 
            reviewedAt: new Date() 
          } 
        },
        { new: true, session: tx }
      );

      if (!request) {
        throw new Error('Request not found or already resolved');
      }

      const handler = changeHandlerRegistry.get(request.entity, request.action);
      const result = await handler.apply(request, overrides || {}, ctx, tx);

      await auditLogger.log({
        actor: ctx.actorId,
        action: `request.approve.${request.entity}.${request.action}`,
        entity: 'ChangeRequest',
        entityId: request._id.toString(),
        before: { status: 'pending' },
        after: { status: 'approved', result },
        ip: ctx.ip,
      }, tx);

      return request;
    });
  }

  static async reject(id: string, reason: string, ctx: ActionContext) {
    const request = await ChangeRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { 
        $set: { 
          status: 'rejected', 
          reviewedBy: ctx.actorId, 
          reviewedAt: new Date(),
          rejectionReason: reason
        } 
      },
      { new: true }
    );

    if (!request) {
      throw new Error('Request not found or already resolved');
    }

    await auditLogger.log({
      actor: ctx.actorId,
      action: `request.reject.${request.entity}.${request.action}`,
      entity: 'ChangeRequest',
      entityId: request._id.toString(),
      after: { status: 'rejected', reason },
      ip: ctx.ip,
    });

    return request;
  }
}
