import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), validate(paginationSchema), auditLogController.findAll);

export default router;
