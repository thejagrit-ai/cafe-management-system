import { Response, NextFunction } from 'express';
import { employeeOpsService } from '../services/employeeOps';
import { createdResponse, paginatedResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';

function requireEmployeeId(req: AuthenticatedRequest) {
  const employeeId = req.user?.employee?.id;
  if (!employeeId) throw new AuthorizationError('Employee profile not found');
  return employeeId;
}

export class EmployeeOpsController {
  async listShifts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, employeeId, status } = req.query;
      const scopedEmployeeId = req.user?.role === 'ADMIN' ? employeeId as string : requireEmployeeId(req);
      const result = await employeeOpsService.listShifts({
        page: Number(page),
        limit: Number(limit),
        employeeId: scopedEmployeeId,
        status: status as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async currentShift(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await employeeOpsService.currentShift(requireEmployeeId(req)));
    } catch (error) {
      next(error);
    }
  }

  async clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await employeeOpsService.clockIn(requireEmployeeId(req), req.body.notes), 'Clocked in');
    } catch (error) {
      next(error);
    }
  }

  async clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await employeeOpsService.clockOut(requireEmployeeId(req), req.body), 'Clocked out');
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await employeeOpsService.getPermissions(req.params.employeeId));
    } catch (error) {
      next(error);
    }
  }

  async setPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await employeeOpsService.setPermissions(req.params.employeeId, req.body.permissions), 'Permissions updated');
    } catch (error) {
      next(error);
    }
  }
}

export const employeeOpsController = new EmployeeOpsController();
