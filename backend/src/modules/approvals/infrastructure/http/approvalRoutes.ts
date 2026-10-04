import { Router } from 'express';
import { ApprovalController } from './approvalController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';
import { approveRequestSchema, rejectRequestSchema } from '../../application/schemas/approvalSchemas';

const router = Router();

// Only admin can approve/reject
router.use(authenticate, authorize('admin'));

router.get('/', ApprovalController.listPending);
router.post('/:id/approve', validate(approveRequestSchema), ApprovalController.approve);
router.post('/:id/reject', validate(rejectRequestSchema), ApprovalController.reject);

export { router as approvalRoutes };
