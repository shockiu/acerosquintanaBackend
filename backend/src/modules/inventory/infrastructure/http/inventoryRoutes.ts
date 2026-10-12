import { Router } from 'express';
import { InventoryController } from './inventoryController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';
import { createItemSchema, updateItemSchema, purchaseSchema } from '../../application/schemas/inventorySchemas';

const router = Router();

router.use(authenticate);

router.get('/items', InventoryController.listItems);
router.post('/items', authorize('admin'), validate(createItemSchema), InventoryController.createItem);
router.patch('/items/:id', validate(updateItemSchema), InventoryController.updateItem);
router.post('/items/:id/purchases', validate(purchaseSchema), InventoryController.registerPurchase);
router.get('/items/:id/remnants', InventoryController.getItemRemnants);
router.post('/remnants/:id/discard', InventoryController.discardRemnant);

export { router as inventoryRoutes };

