import { Router } from 'express';
import { InventoryController } from './inventoryController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { createItemSchema, purchaseSchema } from '../../application/schemas/inventorySchemas';

const router = Router();

router.use(authenticate);

router.get('/items', InventoryController.listItems);
router.post('/items', validate(createItemSchema), InventoryController.createItem);
router.post('/items/:id/purchases', validate(purchaseSchema), InventoryController.registerPurchase);
router.get('/items/:id/remnants', InventoryController.getItemRemnants);
router.post('/remnants/:id/discard', InventoryController.discardRemnant);

export { router as inventoryRoutes };
