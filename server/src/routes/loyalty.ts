import { Router } from 'express';
import { loyaltyController } from '../controllers/loyalty';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, loyaltyController.getMyLoyalty);
router.get('/tiers', loyaltyController.getTiers);
router.post('/adjust', authenticate, authorize('ADMIN'), loyaltyController.adjustPoints);

export default router;
