import { Router } from 'express';
import { employeeController } from '../controllers/employee';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createEmployeeSchema, updateEmployeeSchema, employeeQuerySchema, resetPasswordSchema } from '../validators/employee';
import { idParamSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), validate(employeeQuerySchema), employeeController.findAll);
router.get('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), employeeController.findById);

router.post('/', authenticate, authorize('ADMIN'), validate(createEmployeeSchema), employeeController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(updateEmployeeSchema), employeeController.update);
router.post('/:id/reset-password', authenticate, authorize('ADMIN'), validate(idParamSchema), validate(resetPasswordSchema), employeeController.resetPassword);

export default router;