import { Router } from 'express';
import { orderController } from '../controllers/order';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  orderNumberParamSchema,
} from '../validators/order';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, validate(orderQuerySchema), orderController.findAll);
router.get('/my-orders', authenticate, authorize('CUSTOMER'), validate(orderQuerySchema), orderController.findMyOrders);
router.get('/stats/today', authenticate, authorize('ADMIN', 'STAFF'), orderController.getTodaysStats);
router.get('/pending', authenticate, authorize('ADMIN', 'STAFF'), orderController.getPendingOrders);
// Must precede '/:id': Express matches in registration order, so the bare
// parameter route would otherwise swallow '/number/...' and reject "number"
// as an invalid cuid.
router.get('/number/:orderNumber', optionalAuth, validate(orderNumberParamSchema), orderController.findByOrderNumber);
router.get('/:id', authenticate, validate(idParamSchema), orderController.findById);

router.post('/', optionalAuth, validate(createOrderSchema), orderController.create);
router.put('/:id/status', authenticate, authorize('ADMIN', 'STAFF'), validate(idParamSchema), validate(updateOrderStatusSchema), orderController.updateStatus);

export default router;