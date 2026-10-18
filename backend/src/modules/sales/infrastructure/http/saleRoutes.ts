import { Router } from 'express';
import { SaleController } from './saleController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';
import { createSaleSchema, cancelSaleSchema } from '../../application/schemas/saleSchemas';

const router = Router();

// Authenticated users (admin and user with role-based field restrictions)
router.use(authenticate);

router.get('/', SaleController.listSales);
router.get('/:id', SaleController.getSale);
router.post('/', validate(createSaleSchema), SaleController.createSale);
router.post('/:id/cancel', validate(cancelSaleSchema), SaleController.cancelSale);

export { router as saleRoutes };
