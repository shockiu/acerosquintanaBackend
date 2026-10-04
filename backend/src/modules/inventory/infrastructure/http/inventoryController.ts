import { Request, Response, NextFunction } from 'express';
import { InventoryUseCases } from '../../application/useCases/InventoryUseCases';
import { success } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';

export class InventoryController {
  static async listItems(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        subcategory: req.query.subcategory,
        kind: req.query.kind,
      };
      const items = await InventoryUseCases.listItems(filters);
      
      // Filter out sensitive fields for users
      const serialized = RoleSerializer.serialize(items, req.user.role);
      res.json(success(serialized));
    } catch (error) {
      next(error);
    }
  }

  static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const result = await InventoryUseCases.createItem(req.body, ctx);
      res.status(202).json(success(result)); // 202 Accepted because it might be pending
    } catch (error) {
      next(error);
    }
  }

  static async registerPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const result = await InventoryUseCases.registerPurchase(req.params.id as string, req.body, ctx);
      res.status(202).json(success(result));
    } catch (error) {
      next(error);
    }
  }
}
