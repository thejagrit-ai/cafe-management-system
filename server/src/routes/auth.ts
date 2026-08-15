import { Router } from 'express';
import { authController } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;