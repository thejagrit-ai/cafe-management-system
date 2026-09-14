import { Response, NextFunction } from 'express';
import { employeeOpsService } from '../services/employeeOps';
import { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';

export const requireStaffPermission = (permission: string) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === 'ADMIN') return next();
      const employeeId = req.user?.employee?.id;
      if (!employeeId) throw new AuthorizationError('Employee profile required');
      const allowed = await employeeOpsService.hasPermission(employeeId, permission);
      if (!allowed) throw new AuthorizationError(`Permission ${permission} is disabled`);
      next();
    } catch (error) {
      next(error);
    }
  };
