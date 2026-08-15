import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class PaymentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.create(req.body, req);
      createdResponse(res, payment, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, status, method, dateFrom, dateTo, search } = req.query;
      const result = await paymentService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        status: status as any,
        method: method as any,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        search: search as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Payments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async exportAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sortBy, sortOrder, status, method, dateFrom, dateTo, search } = req.query;
      const payments = await paymentService.exportAll({
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        status: status as any,
        method: method as any,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        search: search as string,
      });
      successResponse(res, payments, 'Payments exported successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payment = await paymentService.updateStatus(req.params.id, req.body, req);
      successResponse(res, payment, 'Payment status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async findByOrderId(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await paymentService.findByOrderId(req.params.orderId);
      successResponse(res, payments);
    } catch (error) {
      next(error);
    }
  }

  async getTotalsByMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo } = req.query;
      const totals = await paymentService.getTotalsByMethod(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      successResponse(res, totals);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();