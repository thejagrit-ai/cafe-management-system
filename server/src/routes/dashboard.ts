import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/admin', authenticate, authorize('ADMIN'), dashboardController.getAdminDashboard);
router.get('/staff', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getStaffDashboard);

export default router;