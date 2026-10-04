import { Request, Response, NextFunction } from 'express';
import { ApprovalUseCases } from '../../application/useCases/ApprovalUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../domain/IChangeHandler';

export class ApprovalController {
  static async listPending(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query.entity ? { entity: req.query.entity } : {};
      const requests = await ApprovalUseCases.listPending(filters);
      res.json(success(requests));
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
