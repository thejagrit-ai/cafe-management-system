import { Router } from 'express';
import { z } from 'zod';
import { employeeOpsController } from '../controllers/employeeOps';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const clockInBody = z.object({ body: z.object({ notes: z.string().max(1000).optional() }) });
const clockOutBody = z.object({ body: z.object({ breakMinutes: z.coerce.number().int().min(0).default(0), notes: z.string().max(1000).optional() }) });
const employeeParam = z.object({ params: z.object({ employeeId: z.string().min(1) }) });
const permissionsBody = z.object({
  body: z.object({
    permissions: z.array(z.object({ permission: z.string().min(1), enabled: z.boolean() })).min(1),
  }),
  params: z.object({ employeeId: z.string().min(1) }),
});

router.get('/shifts', authenticate, authorize('ADMIN', 'STAFF'), employeeOpsController.listShifts);
router.get('/shifts/current', authenticate, authorize('ADMIN', 'STAFF'), employeeOpsController.currentShift);
router.post('/shifts/clock-in', authenticate, authorize('ADMIN', 'STAFF'), validate(clockInBody), employeeOpsController.clockIn);
router.post('/shifts/clock-out', authenticate, authorize('ADMIN', 'STAFF'), validate(clockOutBody), employeeOpsController.clockOut);

router.get('/employees/:employeeId/permissions', authenticate, authorize('ADMIN'), validate(employeeParam), employeeOpsController.getPermissions);
router.put('/employees/:employeeId/permissions', authenticate, authorize('ADMIN'), validate(permissionsBody), employeeOpsController.setPermissions);

export default router;
