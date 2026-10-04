import { Request, Response, NextFunction } from 'express';
import { UserUseCases } from '../../application/useCases/UserUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserUseCases.listUsers();
      res.json(success(users));
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

  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserUseCases.toggleStatus(req.params.id as string, req.body.isActive);
      res.json(success(user));
    } catch (error: any) {
      if (error.message === 'User not found') {
        res.status(404).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }
}
