import { Request, Response, NextFunction } from 'express';
import { InventoryUseCases } from '../../application/useCases/InventoryUseCases';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';

export class InventoryController {
  static async listItems(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        subcategory: req.query.subcategory,
        kind: req.query.kind,
        search: req.query.search,
      };
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await InventoryUseCases.listItems(filters, page, limit);

      if (page && limit && (result as any).pagination) {
        const paginatedResult = result as { items: any[]; pagination: any };
        const serialized = RoleSerializer.serialize(paginatedResult.items, req.user.role);
        return res.json(success({
          items: serialized,
          pagination: paginatedResult.pagination,
        }));
      }

      // Filter out sensitive fields for users
      const serialized = RoleSerializer.serialize(result, req.user.role);
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

  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const result: any = await InventoryUseCases.updateItem(req.params.id as string, req.body, ctx);
      const statusCode = result?.status === 'pending' ? 202 : 200;
      res.status(statusCode).json(success(result));
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

  static async getItemRemnants(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const remnants = await InventoryUseCases.getItemRemnants(req.params.id as string, status);
      const serialized = RoleSerializer.serialize(remnants, req.user.role);
      res.json(success(serialized));
    } catch (error) {
      next(error);
    }
  }

  static async discardRemnant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const note = req.body?.note;
      const result = await InventoryUseCases.discardRemnant(req.params.id as string, note, ctx);
      res.status(202).json(success(result));
    } catch (error: any) {
      if (error.message?.includes('no está disponible')) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }
}
