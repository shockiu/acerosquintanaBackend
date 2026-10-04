import { Router } from 'express';
import { WorkController } from './workController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { createWorkSchema } from '../../application/schemas/workSchemas';

// Register handlers
import '../../domain/handlers/CreateWorkHandler';

const router = Router();

router.use(authenticate);

router.get('/', WorkController.listWorks);
router.get('/:id', WorkController.getWork);
router.post('/', validate(createWorkSchema), WorkController.createWork);

export { router as workRoutes };
