import { Router } from 'express';
import { z } from 'zod';
import { couponController } from '../controllers/coupon';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/auth';

const router = Router();

const couponBody = z.object({
  body: z.object({
    code: z.string().min(1).max(40),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.coerce.number().positive(),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscount: z.coerce.number().min(0).optional(),
    usageLimit: z.coerce.number().int().positive().optional(),
    perCustomerLimit: z.coerce.number().int().positive().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'EXPIRED']).optional(),
  }),
});

const couponUpdateBody = z.object({ body: couponBody.shape.body.partial(), params: z.object({ id: z.string().min(1) }) });
const validateBody = z.object({ body: z.object({ code: z.string().min(1), subtotal: z.coerce.number().min(0) }) });

router.get('/', authenticate, authorize('ADMIN'), validate(paginationSchema), couponController.findAll);
router.post('/', authenticate, authorize('ADMIN'), validate(couponBody), couponController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(couponUpdateBody), couponController.update);
router.post('/validate', authenticate, authorize('CUSTOMER'), validate(validateBody), couponController.validate);

export default router;
