import { Response, NextFunction } from 'express';
import { couponService } from '../services/coupon';
import { createdResponse, paginatedResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class CouponController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;
      const result = await couponService.findAll({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await couponService.create(req.body), 'Coupon created successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await couponService.update(req.params.id, req.body), 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async validate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await couponService.validateForOrder(req.body.code, Number(req.body.subtotal), req.user?.customer?.id);
      successResponse(res, { coupon: result.coupon, discount: result.discount });
    } catch (error) {
      next(error);
    }
  }
}

export const couponController = new CouponController();
