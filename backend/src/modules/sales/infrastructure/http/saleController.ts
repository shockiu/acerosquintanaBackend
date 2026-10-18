import { Request, Response, NextFunction } from 'express';
import { Sale } from '../../../../models/Sale';
import { InventoryItem } from '../../../../models/InventoryItem';
import { createSaleHandler } from '../../domain/handlers/CreateSaleHandler';
import { cancelSaleHandler } from '../../domain/handlers/CancelSaleHandler';
import { uow } from '../../../../shared/infrastructure/MongoUnitOfWork';
import { success, fail } from '../../../../shared/infrastructure/httpResponse';
import { RoleSerializer } from '../../../../shared/serialization/RoleSerializer';
import { Decimal } from 'decimal.js';

export class SaleController {
  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user.role === 'user') {
        // Operario: no define precios. Se enriquecen los nombres de los ítems y cantidades para aprobación.
        const itemIds = (req.body.items || []).map((it: any) => it.item);
        const invItems = await InventoryItem.find({ _id: { $in: itemIds } }).select('name kind pieceSpec avgUnitCost stock').lean();
        const invMap = new Map(invItems.map(i => [i._id.toString(), i]));

        const itemsWithoutPrices = (req.body.items || []).map((it: any) => {
          const inv = invMap.get(it.item?.toString());
          const unitSym = it.unitSymbol || (inv?.pieceSpec ? 'pz' : 'unid.');
          return {
            item: it.item,
            name: it.name || inv?.name || 'Ítem',
            kind: inv?.kind || 'material',
            quantity: it.quantity,
            unitSymbol: unitSym,
            currentStock: Number(inv?.stock ?? 0),
            avgUnitCost: Number(inv?.avgUnitCost ?? 0),
          };
        });

        const itemsSummary = itemsWithoutPrices
          .map(it => `${it.quantity}${it.unitSymbol ? ` ${it.unitSymbol}` : ''} de ${it.name}`)
          .join(', ');

        const payload = {
          buyerName: req.body.buyerName?.trim() || 'Cliente General',
          performedAt: req.body.performedAt,
          notes: req.body.notes?.trim() || '',
          items: itemsWithoutPrices,
        };

        const { ApprovalUseCases } = await import('../../../approvals/application/useCases/ApprovalUseCases');
        const changeRequest = await ApprovalUseCases.submitRequest(
          {
            entity: 'sale',
            action: 'create',
            targetName: `Venta a ${payload.buyerName}: ${itemsSummary}`,
            payload,
          },
          {
            actorId: req.user._id,
            role: 'user',
            ip: req.ip,
          }
        );

        return res.status(201).json(
          success({
            isPendingApproval: true,
            message: 'Solicitud de venta enviada a aprobación del administrador',
            changeRequest,
          })
        );
      }

      // Admin: Ejecución directa con precios
      const sale = await uow.runInTransaction(async (session) => {
        return await createSaleHandler.execute(req.body, req.user._id, session);
      });

      await sale.populate('registeredBy', 'name email');
      const serialized = RoleSerializer.serialize(sale, req.user.role);
      res.status(201).json(success(serialized));
    } catch (error: any) {
      if (
        error.message.includes('Stock insuficiente') ||
        error.message.includes('debe ser mayor a 0') ||
        error.message.includes('no existe') ||
        error.message.includes('no puede ser negativo')
      ) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }

  static async listSales(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      const query: any = {};

      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }

      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search as string, 'i');
        query.$or = [
          { buyerName: searchRegex },
          { folio: searchRegex },
          { notes: searchRegex },
          { 'items.name': searchRegex },
        ];
      }

      if (req.query.startDate || req.query.endDate) {
        query.performedAt = {};
        if (req.query.startDate) {
          query.performedAt.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          query.performedAt.$lte = new Date(req.query.endDate as string);
        }
      }

      const [sales, total, summaryAgg] = await Promise.all([
        Sale.find(query)
          .sort({ performedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('registeredBy', 'name email')
          .populate('cancelledBy', 'name email')
          .lean(),
        Sale.countDocuments(query),
        Sale.aggregate([
          { $match: { ...query, status: 'completed' } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              totalCost: { $sum: '$totalCost' },
              totalProfit: { $sum: '$profit' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const agg = summaryAgg[0] || {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        count: 0,
      };

      const revenueDec = new Decimal(agg.totalRevenue?.toString() || '0');
      const profitDec = new Decimal(agg.totalProfit?.toString() || '0');
      const marginDec = revenueDec.gt(0)
        ? profitDec.div(revenueDec).mul(100).toDecimalPlaces(2)
        : new Decimal(0);

      const serializedSales = RoleSerializer.serialize(sales, req.user.role);

      res.json(
        success({
          sales: serializedSales,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit) || 1,
          },
          summary: req.user.role === 'admin' ? {
            totalRevenue: revenueDec.toNumber(),
            totalCost: new Decimal(agg.totalCost?.toString() || '0').toNumber(),
            totalProfit: profitDec.toNumber(),
            profitMargin: marginDec.toNumber(),
            completedCount: agg.count,
          } : null,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getSale(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await Sale.findById(req.params.id)
        .populate('registeredBy', 'name email')
        .populate('cancelledBy', 'name email')
        .lean();

      if (!sale) {
        return res.status(404).json(fail('La venta no fue encontrada'));
      }

      const serialized = RoleSerializer.serialize(sale, req.user.role);
      res.json(success(serialized));
    } catch (error) {
      next(error);
    }
  }

  static async cancelSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;

      if (req.user.role === 'user') {
        const sale = await Sale.findById(req.params.id);
        if (!sale) {
          return res.status(404).json(fail('La venta no fue encontrada'));
        }
        if (sale.status === 'cancelled') {
          return res.status(400).json(fail('Esta venta ya fue anulada previamente'));
        }

        const saleItemsSummary = (sale.items || [])
          .map((it: any) => `${it.quantity}${it.unitSymbol ? ` ${it.unitSymbol}` : ''} de ${it.name}`)
          .join(', ');

        const { ApprovalUseCases } = await import('../../../approvals/application/useCases/ApprovalUseCases');
        const changeRequest = await ApprovalUseCases.submitRequest(
          {
            entity: 'sale',
            action: 'cancel',
            targetId: sale._id,
            targetName: `Venta ${sale.folio || sale._id} (${sale.buyerName}: ${saleItemsSummary})`,
            payload: {
              reason: reason?.trim(),
              folio: sale.folio,
              buyerName: sale.buyerName,
              items: sale.items,
            },
          },
          {
            actorId: req.user._id,
            role: 'user',
            ip: req.ip,
          }
        );

        return res.json(
          success({
            isPendingApproval: true,
            message: 'Solicitud de anulación enviada a aprobación del administrador',
            changeRequest,
          })
        );
      }

      // Admin execution
      const sale = await uow.runInTransaction(async (session) => {
        return await cancelSaleHandler.execute(req.params.id, reason, req.user._id, session);
      });

      await sale.populate('registeredBy', 'name email');
      await sale.populate('cancelledBy', 'name email');
      const serialized = RoleSerializer.serialize(sale, req.user.role);
      res.json(success(serialized));
    } catch (error: any) {
      if (error.message.includes('ya fue anulada') || error.message.includes('no existe')) {
        return res.status(400).json(fail(error.message));
      }
      next(error);
    }
  }
}
