import { Router } from 'express';
import { settingsController } from '../controllers/settings';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateBusinessSettingsSchema } from '../validators/settings';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), settingsController.find);
router.put('/', authenticate, authorize('ADMIN'), validate(updateBusinessSettingsSchema), settingsController.update);

export default router;