import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { OrderStatus } from '@prisma/client';

export class OrderController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.create(req.body, req);
      createdResponse(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, status, type, customerId, employeeId, dateFrom, dateTo } = req.query;
      
      // Customers can only see their own orders
      const isCustomer = req.user?.role === 'CUSTOMER';
      const effectiveCustomerId = isCustomer ? req.user?.customer?.id : customerId;

      const result = await orderService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        status: status as OrderStatus,
        type: type as any,
        customerId: effectiveCustomerId as string,
        employeeId: employeeId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.findById(req.params.id);
      
      // Check authorization
      const isCustomer = req.user?.role === 'CUSTOMER';
      if (isCustomer && order.customerId !== req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
      }

      successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  async findByOrderNumber(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.findByOrderNumber(req.params.orderNumber);

      // Same ownership rule as findById: an order number must not act as a
      // bearer token for someone else's order details.
      const isCustomer = req.user?.role === 'CUSTOMER';
      if (isCustomer && order.customerId !== req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
      }

      successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  async findMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const { page = 1, limit = 10 } = req.query;
      const result = await orderService.findByCustomer(req.user.customer.id, {
        page: Number(page),
        limit: Number(limit),
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await orderService.updateStatus(req.params.id, req.body, req);
      successResponse(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTodaysStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await orderService.getTodaysStats();
      successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getPendingOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.getPendingOrders();
      successResponse(res, orders);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();