import { Request, Response, NextFunction } from 'express';
import { ExportUseCases } from '../../application/useCases/ExportUseCases';
import { ActionContext } from '../../../approvals/domain/IChangeHandler';

export class ExportController {
  static async exportInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const workbook = await ExportUseCases.exportInventory(ctx);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="inventario.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  static async exportWorks(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx: ActionContext = { actorId: req.user._id, role: req.user.role, ip: req.ip };
      const workbook = await ExportUseCases.exportWorks(ctx);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="obras.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}
