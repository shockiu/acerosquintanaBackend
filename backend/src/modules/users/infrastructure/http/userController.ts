import { Request, Response, NextFunction } from 'express';
import { UserUseCases } from '../../application/useCases/UserUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const filters = {
        search: req.query.search as string | undefined,
        role: req.query.role as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };
      const result = await UserUseCases.listUsers(filters, page, limit);
      res.json(success(result));
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserUseCases.createUser(req.body);
      res.status(201).json(success(user));
    } catch (error: any) {
      if (error.message === 'Email already in use') {
        res.status(409).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserUseCases.updateUser(req.params.id as string, req.body);
      res.json(success(user));
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json(fail(error.message));
      } else if (error.message === 'Email already in use') {
        res.status(409).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserUseCases.changePassword(req.params.id as string, req.body.password);
      res.json(success(user));
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.id || (req as any).user?._id;
      const user = await UserUseCases.toggleStatus(req.params.id as string, req.body.isActive, actorId);
      res.json(success(user));
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json(fail(error.message));
      } else if (error.message.includes('No puedes') || error.message.includes('No se puede')) {
        res.status(400).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }
}
