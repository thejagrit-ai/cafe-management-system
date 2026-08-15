import { Router } from 'express';
import { customerController } from '../controllers/customer';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAddressSchema, updateAddressSchema } from '../validators/address';
import { idParamSchema, paginationSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), validate(paginationSchema), customerController.findAll);
router.get('/me', authenticate, authorize('CUSTOMER'), customerController.findById);
router.put('/me/profile', authenticate, authorize('CUSTOMER'), customerController.updateProfile);

router.get('/me/addresses', authenticate, authorize('CUSTOMER'), customerController.getAddresses);
router.post('/me/addresses', authenticate, authorize('CUSTOMER'), validate(createAddressSchema), customerController.createAddress);
router.put('/me/addresses/:id', authenticate, authorize('CUSTOMER'), validate(idParamSchema), validate(updateAddressSchema), customerController.updateAddress);
router.delete('/me/addresses/:id', authenticate, authorize('CUSTOMER'), validate(idParamSchema), customerController.deleteAddress);

router.get('/me/orders', authenticate, authorize('CUSTOMER'), validate(paginationSchema), customerController.getMyOrders);
router.get('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), customerController.findById);

export default router;