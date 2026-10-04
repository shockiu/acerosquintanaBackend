import { ChangeRequest } from '../../../../models/ChangeRequest';
import { changeHandlerRegistry } from '../../domain/ChangeHandlerRegistry';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';
import { auditLogger } from '../../../audit/infrastructure/persistence/AuditLogger';
import { ActionContext } from '../../domain/IChangeHandler';

export class ApprovalUseCases {
  static async listPending(filters: any) {
    const query: any = { status: 'pending' };
    if (filters.entity) query.entity = filters.entity;
    
    return ChangeRequest.find(query).populate('requestedBy', 'name email').sort({ createdAt: -1 });
  }

  static async submitRequest(data: { entity: string, action: string, targetId?: string, payload: any }, ctx: ActionContext) {
    return ChangeRequest.create({
      ...data,
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
