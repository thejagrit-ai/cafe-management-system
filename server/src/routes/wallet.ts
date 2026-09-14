import { Router } from 'express';
import { z } from 'zod';
import { walletController } from '../controllers/wallet';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/auth';

const router = Router();

const giftCardBody = z.object({
  body: z.object({
    code: z.string().min(1).max(40).optional(),
    initialValue: z.coerce.number().positive(),
    purchaserName: z.string().max(100).optional(),
    recipientEmail: z.string().email().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});
const redeemBody = z.object({ body: z.object({ code: z.string().min(1).max(40) }) });

router.get('/me', authenticate, authorize('CUSTOMER'), walletController.getWallet);
router.post('/redeem-gift-card', authenticate, authorize('CUSTOMER'), validate(redeemBody), walletController.redeemGiftCard);
router.get('/gift-cards', authenticate, authorize('ADMIN'), validate(paginationSchema), walletController.listGiftCards);
router.post('/gift-cards', authenticate, authorize('ADMIN'), validate(giftCardBody), walletController.createGiftCard);

export default router;
