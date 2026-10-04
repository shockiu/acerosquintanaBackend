import { Request, Response, NextFunction } from 'express';
import { AuditUseCases } from '../../application/useCases/AuditUseCases';
import { success } from '../../../../shared/infrastructure/httpResponse';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, actor, action, entity } = req.query;
      
      const filters = {
        actor: actor ? String(actor) : undefined,
        action: action ? String(action) : undefined,
        entity: entity ? String(entity) : undefined,
      };

      const p = parseInt(page as string) || 1;
      const l = parseInt(limit as string) || 20;

      const result = await AuditUseCases.listLogs(filters, p, l);
      res.json(success(result));
    } catch (error) {
      next(error);
    }
  }
}
