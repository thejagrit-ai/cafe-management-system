import { Router } from 'express';
import { z } from 'zod';
import { customerEngagementController } from '../controllers/customerEngagement';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const favoriteBody = z.object({ body: z.object({ productId: z.string().min(1), notes: z.string().optional() }) });
const productParam = z.object({ params: z.object({ productId: z.string().min(1) }) });
const reviewBody = z.object({
  body: z.object({
    productId: z.string().min(1),
    orderId: z.string().min(1).optional(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

router.get('/favorites', authenticate, authorize('CUSTOMER'), customerEngagementController.listFavorites);
router.post('/favorites', authenticate, authorize('CUSTOMER'), validate(favoriteBody), customerEngagementController.addFavorite);
router.delete('/favorites/:productId', authenticate, authorize('CUSTOMER'), validate(productParam), customerEngagementController.removeFavorite);

router.get('/reviews', authenticate, authorize('ADMIN', 'CUSTOMER'), customerEngagementController.listReviews);
router.post('/reviews', authenticate, authorize('CUSTOMER'), validate(reviewBody), customerEngagementController.createReview);
router.get('/reviews/summary', authenticate, authorize('ADMIN', 'CUSTOMER'), customerEngagementController.summary);

export default router;
