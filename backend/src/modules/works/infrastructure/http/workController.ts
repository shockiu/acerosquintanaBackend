import { Request, Response, NextFunction } from 'express';
import { WorkUseCases } from '../../application/useCases/WorkUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';

export class WorkController {
  static async listWorks(req: Request, res: Response, next: NextFunction) {
    try {
      const works = await WorkUseCases.listWorks();
      const serialized = RoleSerializer.serialize(works, req.user.role);
      res.json(success(serialized));
    } catch (error) {
      next(error);
    }
  }

  static async getWork(req: Request, res: Response, next: NextFunction) {
    try {
      const work = await WorkUseCases.getWorkById(req.params.id as string);
      const serialized = RoleSerializer.serialize(work, req.user.role);
      res.json(success(serialized));
    } catch (error: any) {
      if (error.message === 'Work not found') return res.status(404).json(fail(error.message));
      next(error);
    }
  }

  static async createWork(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const work = await WorkUseCases.createWork(req.body, ctx);
      
      const serialized = RoleSerializer.serialize(work, req.user.role);
      res.status(202).json(success(serialized)); // 202 Accepted
    } catch (error: any) {
      if (error.message.includes('Insufficient stock')) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }
}
