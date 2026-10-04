import { Request, Response, NextFunction } from 'express';
import { fail } from '../shared/infrastructure/httpResponse';

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(fail('Unauthorized: Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(fail('Forbidden: Insufficient permissions'));
    }

    next();
  };
};
