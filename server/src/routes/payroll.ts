import { Router } from 'express';
import { payrollController } from '../controllers/payroll';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { compensationBodySchema, compensationParamSchema, payrollSummaryQuerySchema } from '../validators/payroll';

const router = Router();

router.get('/summary', authenticate, authorize('ADMIN'), validate(payrollSummaryQuerySchema), payrollController.summary);
router.put(
  '/employees/:employeeId/compensation',
  authenticate,
  authorize('ADMIN'),
  validate(compensationParamSchema),
  validate(compensationBodySchema),
  payrollController.updateCompensation,
);

export default router;
