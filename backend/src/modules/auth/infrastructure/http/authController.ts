import { Request, Response, NextFunction } from 'express';
import { AuthUseCases } from '../../application/useCases/AuthUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthUseCases.login(email, password);
      res.json(success(result));
    } catch (error: any) {
      if (error.message === 'Invalid credentials' || error.message === 'User is deactivated') {
        res.status(401).json(fail(error.message));
      } else {
        next(error);
      }
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json(fail('Not authenticated'));
      }
      const result = await AuthUseCases.me(req.user._id);
      res.json(success(result));
    } catch (error) {
      next(error);
    }
  }
}
