import { Work } from '../../../../models/Work';
import { ApprovalUseCases } from '../../../approvals/application/useCases/ApprovalUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { changeHandlerRegistry } from '../../../approvals/domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';

export class WorkUseCases {
  static async listWorks() {
    return Work.find().sort({ performedAt: -1 });
  }

  static async getWorkById(id: string) {
    const work = await Work.findById(id).populate('items.item');
    if (!work) throw new Error('Work not found');
    return work;
  }

  static async createWork(data: any, ctx: ActionContext) {
    if (ctx.role === 'user') {
      // User creates a pending request. Prices shouldn't be sent by users.
      delete data.chargedPrice;
      
      const request = await ApprovalUseCases.submitRequest({
        entity: 'work',
        action: 'create',
        payload: data,
      }, ctx);

      // Create a dummy record with 'pending_approval' status so users can see it
      const work = await Work.create({
        clientName: data.clientName,
        description: data.description,
        performedAt: new Date(data.performedAt),
        status: 'pending_approval',
        createdBy: ctx.actorId,
      });

      // Update the targetId of the request to point to the dummy record
      (request as any).targetId = work._id as any;
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
}
