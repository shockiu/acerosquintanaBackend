import { Request, Response, NextFunction } from 'express';
import { WorkUseCases } from '../../application/useCases/WorkUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';

export class WorkController {
  static async listWorks(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result: any = await WorkUseCases.listWorks(filters, page, limit);

      if (page && limit && result.pagination) {
        const serialized = RoleSerializer.serialize(result.works, req.user.role);
        return res.json(success({
          works: serialized,
          pagination: result.pagination,
        }));
      }

      const serialized = RoleSerializer.serialize(result, req.user.role);
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
      if (error.message.includes('Insufficient stock') || error.message.includes('Stock insuficiente')) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }

  static async reverseWork(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const result = await WorkUseCases.reverseWork(req.params.id as string, ctx);
      res.status(202).json(success(result));
    } catch (error: any) {
      if (error.message.includes('Reversión bloqueada') || error.message.includes('Solo se pueden revertir')) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }
}
