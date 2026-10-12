import { Request, Response, NextFunction } from 'express';
import { ApprovalUseCases } from '../../application/useCases/ApprovalUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../domain/IChangeHandler';

export class ApprovalController {
  static async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const filters = {
        entity: req.query.entity as string | undefined,
      };

      const result: any = await ApprovalUseCases.listPending(filters, page, limit);

      if (page && limit && result.pagination) {
        return res.json(success({
          requests: result.requests,
          pagination: result.pagination,
        }));
      }

      res.json(success(result));
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const request = await ApprovalUseCases.approve(req.params.id as string, req.body.overrides, ctx);
      res.json(success(request));
    } catch (error: any) {
      if (error.message.includes('already resolved')) {
        return res.status(409).json(fail(error.message));
      }
      next(error);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const request = await ApprovalUseCases.reject(req.params.id as string, req.body.reason, ctx);
      res.json(success(request));
    } catch (error: any) {
      if (error.message.includes('already resolved')) {
        return res.status(409).json(fail(error.message));
      }
      next(error);
    }
  }
}
