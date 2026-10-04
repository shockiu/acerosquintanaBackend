import { Router } from 'express';
import { AuthController } from './authController';
import { validate } from '../../../../middleware/validate';
import { loginSchema } from '../../application/schemas/authSchemas';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.me);

export { router as authRoutes };
