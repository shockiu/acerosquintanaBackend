import { Work } from '../../../../models/Work';
import { InventoryItem } from '../../../../models/InventoryItem';
import { ChangeRequest } from '../../../../models/ChangeRequest';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class WorkUseCases {
  static async listWorks(filters?: any, page?: number, limit?: number) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.search) {
      query.$or = [
        { clientName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    let worksQuery = Work.find(query)
      .sort({ performedAt: -1 })
      .populate('items.item')
      .populate('waste.item')
      .populate('waste.subcategory')
      .populate('waste.measureUnit');
    let total = 0;

    if (page && limit) {
      const skip = (page - 1) * limit;
      total = await Work.countDocuments(query);
      worksQuery = worksQuery.skip(skip).limit(limit) as any;
    }

    const rawWorks = await worksQuery.lean();

    const pendingReversals = await ChangeRequest.find({
      entity: 'work',
      action: 'delete',
      status: 'pending',
    }).select('targetId').lean();

    const pendingReversalIds = new Set(pendingReversals.map((r: any) => r.targetId?.toString()));

    const works = rawWorks.map((w: any) => ({
      ...w,
      hasPendingReversal: pendingReversalIds.has(w._id.toString()),
    }));

    if (page && limit) {
      return {
        works,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }

    return works;
  }

  static async getWorkById(id: string) {
    const work = await Work.findById(id)
      .populate('items.item')
      .populate('waste.item')
      .populate('waste.subcategory')
      .populate('waste.measureUnit')
      .lean();
    if (!work) throw new Error('Work not found');

    const pendingReversal = await ChangeRequest.findOne({
      entity: 'work',
      action: 'delete',
      targetId: id,
      status: 'pending',
    }).lean();

    return {
      ...work,
      hasPendingReversal: !!pendingReversal,
    };
  }

  static async createWork(data: any, ctx: ActionContext) {
    if (ctx.role === 'user') {
      // User creates a pending request. Prices shouldn't be sent by users.
      delete data.chargedPrice;

      // Enrich items with material names and details so the change request is self-descriptive
      if (data.items && Array.isArray(data.items)) {
        for (const line of data.items) {
          if (line.item) {
            try {
              const itemDoc = await InventoryItem.findById(line.item).select('name kind pieceSpec description').lean();
              if (itemDoc) {
                line.itemName = itemDoc.name;
                line.kind = line.kind || itemDoc.kind;
                if (itemDoc.description) line.description = itemDoc.description;
              }
            } catch {
              // ignore
            }
          }
        }
      }

      const targetName = data.clientName
        ? (data.description ? `${data.clientName} - ${data.description}` : data.clientName)
        : (data.description || 'Obra');

      const request = await ApprovalUseCases.submitRequest({
        entity: 'work',
        action: 'create',
        targetName,
        payload: data,
      }, ctx);

      // Create a dummy record with 'pending_approval' status so users can see it
      const work = await Work.create({
        clientName: data.clientName,
        description: data.description,
        performedAt: new Date(data.performedAt),
        status: 'pending_approval',
        items: data.items || [],
        createdBy: ctx.actorId,
      });

      // Update the targetId and targetName of the request to point to the dummy record
      (request as any).targetId = work._id as any;
      (request as any).targetName = targetName;
      await (request as any).save();

      return work;
    } else {
      // Admin: apply directly
      const requestData = { entity: 'work', action: 'create', payload: data, status: 'approved', requestedBy: ctx.actorId, reviewedBy: ctx.actorId, reviewedAt: new Date() };
      return uow.runInTransaction(async (tx) => {
        const handler = changeHandlerRegistry.get('work', 'create');
        const result = await handler.apply(requestData as any, {}, ctx, tx);
        
        const { auditLogger } = await import('../../../audit/infrastructure/persistence/AuditLogger');
        await auditLogger.log({
          actor: ctx.actorId,
          action: `work.create.direct`,
          entity: 'work',
          entityId: result._id?.toString(),
          after: result,
          ip: ctx.ip,
        }, tx);
        
        return result;
      });
    }
  }

  static async reverseWork(id: string, ctx: ActionContext) {
    const work = await Work.findById(id)
      .populate('items.item')
      .populate('waste.item')
      .populate('waste.subcategory')
      .populate('waste.measureUnit');
    if (!work) {
      throw new Error('Obra no encontrada');
    }
    if (work.status !== 'approved') {
      throw new Error(`Solo se pueden revertir obras aprobadas. Estado actual: ${work.status}`);
    }

    // Prevent duplicate pending reversal requests!
    const existingPending = await ChangeRequest.findOne({
      entity: 'work',
      action: 'delete',
      targetId: id,
      status: 'pending',
    });
    if (existingPending) {
      throw new Error('Esta obra ya tiene una solicitud de reversión pendiente en cola para aprobación del administrador.');
    }

    if (ctx.role === 'user') {
      const targetName = work.clientName
        ? (work.description ? `${work.clientName} - ${work.description}` : work.clientName)
        : work.description;

      const payload = {
        workId: work._id.toString(),
        clientName: work.clientName,
        description: work.description,
        performedAt: work.performedAt,
        chargedPrice: work.chargedPrice?.toString(),
        materialsCost: (work.materialsCost || work.totalCost)?.toString(),
        wasteCost: work.wasteCost?.toString(),
        profit: work.profit?.toString(),
        items: (work.items || []).map((it: any) => ({
          item: it.item?._id?.toString() || it.item?.toString(),
          itemName: it.item?.name || 'Material',
          description: it.item?.description,
          kind: it.kind,
          mode: it.mode,
          source: it.source,
          quantity: it.quantity?.toString(),
          piecesConsumed: it.piecesConsumed?.toString(),
          measureUsed: it.measureUsed?.toString(),
          unitSymbol: (it.item?.pieceSpec?.measureUnit as any)?.symbol || 'm',
          subtotal: it.subtotal?.toString(),
        })),
        waste: (work.waste || []).map((w: any) => ({
          itemName: w.item?.name || 'Material',
          measure: w.measure?.toString(),
          cost: w.cost?.toString(),
          note: w.note,
        })),
        note: 'Solicitud de reversión de obra',
      };

      return ApprovalUseCases.submitRequest({
        entity: 'work',
        action: 'delete',
        targetId: id,
        targetName,
        payload,
      }, ctx);
    } else {
      const requestData = {
        entity: 'work',
        action: 'delete',
        targetId: id,
        payload: {},
        status: 'approved',
        requestedBy: ctx.actorId,
        reviewedBy: ctx.actorId,
        reviewedAt: new Date(),
      };
      return uow.runInTransaction(async (tx) => {
        const handler = changeHandlerRegistry.get('work', 'delete');
        const result = await handler.apply(requestData as any, {}, ctx, tx);
        const { auditLogger } = await import('../../../audit/infrastructure/persistence/AuditLogger');
        await auditLogger.log({
          actor: ctx.actorId,
          action: `work.delete.direct`,
          entity: 'work',
          entityId: id,
          after: result,
          ip: ctx.ip,
        }, tx);
        return result;
      });
    }
  }
}
