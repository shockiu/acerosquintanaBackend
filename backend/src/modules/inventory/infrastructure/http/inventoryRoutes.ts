import { Router } from 'express';
import { InventoryController } from './inventoryController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { createItemSchema, purchaseSchema } from '../../application/schemas/inventorySchemas';

// Register handlers
import '../../domain/handlers/CreateItemHandler';
import '../../domain/handlers/PurchaseHandler';

const router = Router();

router.use(authenticate);

router.get('/items', InventoryController.listItems);
router.post('/items', validate(createItemSchema), InventoryController.createItem);
router.post('/items/:id/purchases', validate(purchaseSchema), InventoryController.registerPurchase);

export { router as inventoryRoutes };
