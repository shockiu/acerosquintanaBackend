import { Router } from 'express';
import { AuditController } from './auditController';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';

const router = Router();

// Only admins can view audit logs
router.use(authenticate, authorize('admin'));

router.get('/', AuditController.list);

export { router as auditRoutes };
