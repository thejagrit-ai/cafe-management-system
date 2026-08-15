import { Router } from 'express';
import { paymentController } from '../controllers/payment';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPaymentSchema,
  paymentQuerySchema,
  paymentExportQuerySchema,
  updatePaymentStatusSchema,
} from '../validators/order';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'STAFF'), validate(paymentQuerySchema), paymentController.findAll);
router.get('/export', authenticate, authorize('ADMIN'), validate(paymentExportQuerySchema), paymentController.exportAll);
router.get('/totals-by-method', authenticate, authorize('ADMIN'), paymentController.getTotalsByMethod);
router.get('/order/:orderId', authenticate, validate(idParamSchema), paymentController.findByOrderId);

router.post('/', authenticate, authorize('ADMIN', 'STAFF'), validate(createPaymentSchema), paymentController.create);

// Settling, failing or refunding a recorded payment is an admin action.
router.put('/:id/status', authenticate, authorize('ADMIN'), validate(updatePaymentStatusSchema), paymentController.updateStatus);

export default router;