import { Response, NextFunction } from 'express';
import { reportService } from '../services/report';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class ReportController {
  async getSalesReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, groupBy } = req.query;
      const report = await reportService.getSalesReport({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        groupBy: groupBy as 'day' | 'week' | 'month',
      });
      successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }

  async getInventoryReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;
      const report = await reportService.getInventoryReport({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }

  async getProductReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, limit } = req.query;
      const report = await reportService.getProductReport({
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        limit: limit ? Number(limit) : 10,
      });
      successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type, dateFrom, dateTo } = req.query;
      const data = await reportService.exportReport({
        type: type as any,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
      });
      successResponse(res, data, 'Report exported successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();