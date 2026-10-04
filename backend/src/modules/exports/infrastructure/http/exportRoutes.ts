import { Router } from 'express';
import { ExportController } from './exportController';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/inventory.xlsx', ExportController.exportInventory);
router.get('/works.xlsx', ExportController.exportWorks);

export { router as exportRoutes };
