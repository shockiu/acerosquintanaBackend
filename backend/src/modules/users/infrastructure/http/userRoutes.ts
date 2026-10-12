import { Router } from 'express';
import { UserController } from './userController';
import { validate } from '../../../../middleware/validate';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';
import { createUserSchema, updateUserSchema, toggleUserStatusSchema, changePasswordSchema } from '../../application/schemas/userSchemas';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', UserController.list);
router.post('/', validate(createUserSchema), UserController.create);
router.patch('/:id', validate(updateUserSchema), UserController.update);
router.patch('/:id/password', validate(changePasswordSchema), UserController.changePassword);
router.patch('/:id/status', validate(toggleUserStatusSchema), UserController.toggleStatus);

export { router as userRoutes };
