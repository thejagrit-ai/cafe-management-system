import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  async getAdminDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? Number(req.query.days) : 30;
      const dashboard = await dashboardService.getAdminDashboard(days);
      successResponse(res, dashboard);
    } catch (error) {
      next(error);
    }
  }

  async getStaffDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await dashboardService.getStaffDashboard();
      successResponse(res, dashboard);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();