import { Router } from 'express';
import { reportController } from '../controllers/report';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { reportQuerySchema, productReportQuerySchema, exportReportQuerySchema } from '../validators/report';

const router = Router();

router.get('/sales', authenticate, authorize('ADMIN'), validate(reportQuerySchema), reportController.getSalesReport);
router.get('/inventory', authenticate, authorize('ADMIN'), validate(reportQuerySchema), reportController.getInventoryReport);
router.get('/products', authenticate, authorize('ADMIN'), validate(productReportQuerySchema), reportController.getProductReport);
router.get('/export', authenticate, authorize('ADMIN'), validate(exportReportQuerySchema), reportController.exportReport);

export default router;