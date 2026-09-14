import { Router } from 'express';
import { z } from 'zod';
import { purchaseOrderController } from '../controllers/purchaseOrder';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/auth';

const router = Router();

const idParam = z.object({ params: z.object({ id: z.string().min(1) }) });
const createBody = z.object({
  body: z.object({
    supplierId: z.string().min(1).optional(),
    expectedAt: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(z.object({
      ingredientId: z.string().min(1),
      quantity: z.coerce.number().positive(),
      unitCost: z.coerce.number().min(0).optional(),
    })).min(1),
  }),
});
const statusBody = z.object({
  body: z.object({ status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']) }),
  params: z.object({ id: z.string().min(1) }),
});
const receiveBody = z.object({
  body: z.object({
    items: z.array(z.object({ itemId: z.string().min(1), quantity: z.coerce.number().positive() })).min(1),
  }),
  params: z.object({ id: z.string().min(1) }),
});

router.get('/', authenticate, authorize('ADMIN'), validate(paginationSchema), purchaseOrderController.findAll);
router.post('/', authenticate, authorize('ADMIN'), validate(createBody), purchaseOrderController.create);
router.put('/:id/status', authenticate, authorize('ADMIN'), validate(statusBody), purchaseOrderController.updateStatus);
router.post('/:id/receive', authenticate, authorize('ADMIN'), validate(receiveBody), purchaseOrderController.receive);

export default router;
