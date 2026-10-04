import { Router } from 'express';
import { CatalogController } from './catalogController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';
import { 
  createCategorySchema, 
  updateCategorySchema, 
  createSubcategorySchema, 
  updateSubcategorySchema 
} from '../../application/schemas/catalogSchemas';

const router = Router();

router.use(authenticate);

// Units (read-only)
router.get('/units', CatalogController.listUnits);

// Categories
router.get('/categories', CatalogController.listCategories);
router.post('/categories', authorize('admin'), validate(createCategorySchema), CatalogController.createCategory);
router.patch('/categories/:id', authorize('admin'), validate(updateCategorySchema), CatalogController.updateCategory);

// Subcategories
router.get('/subcategories', CatalogController.listSubcategories);
router.post('/subcategories', authorize('admin'), validate(createSubcategorySchema), CatalogController.createSubcategory);
router.patch('/subcategories/:id', authorize('admin'), validate(updateSubcategorySchema), CatalogController.updateSubcategory);

export { router as catalogRoutes };
