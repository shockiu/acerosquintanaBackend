import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { fail } from '../shared/infrastructure/httpResponse';
import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(fail('Unauthorized: Missing or invalid token'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json(fail('Unauthorized: User not found'));
    }

    if (!user.isActive) {
      return res.status(403).json(fail('Forbidden: User is deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(fail('Unauthorized: Invalid token'));
  }
};
