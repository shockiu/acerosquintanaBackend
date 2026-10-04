import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { fail } from '../shared/infrastructure/httpResponse';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json(fail('Validation error', err.issues));
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json(fail('Database validation error', err.message));
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    return res.status(409).json(fail('Duplicate entry', Object.keys((err as any).keyValue)));
  }

  return res.status(500).json(fail('Internal server error', env.NODE_ENV === 'development' ? err.message : undefined));
};
