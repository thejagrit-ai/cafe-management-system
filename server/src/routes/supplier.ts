import { Router } from 'express';
import { supplierController } from '../controllers/supplier';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSupplierSchema, updateSupplierSchema, supplierQuerySchema } from '../validators/supplier';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), validate(supplierQuerySchema), supplierController.findAll);
router.get('/active', authenticate, authorize('ADMIN', 'STAFF'), supplierController.findAllActive);
router.get('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), supplierController.findById);

router.post('/', authenticate, authorize('ADMIN'), validate(createSupplierSchema), supplierController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateSupplierSchema), supplierController.update);

export default router;