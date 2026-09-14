import { Response, NextFunction } from 'express';
import { purchaseOrderService } from '../services/purchaseOrder';
import { createdResponse, paginatedResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class PurchaseOrderController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, supplierId } = req.query;
      const result = await purchaseOrderService.findAll({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        supplierId: supplierId as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await purchaseOrderService.create(req.body, req.user?.id), 'Purchase order created');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await purchaseOrderService.updateStatus(req.params.id, req.body.status), 'Purchase order updated');
    } catch (error) {
      next(error);
    }
  }

  async receive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await purchaseOrderService.receive(req.params.id, req.body.items, req.user?.id), 'Stock received');
    } catch (error) {
      next(error);
    }
  }
}

export const purchaseOrderController = new PurchaseOrderController();
