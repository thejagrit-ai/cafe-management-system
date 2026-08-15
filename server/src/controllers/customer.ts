import { Response, NextFunction } from 'express';
import { customerService } from '../services/customer';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class CustomerController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search } = req.query;
      const result = await customerService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Customers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.findById(req.params.id);
      successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const customer = await customerService.updateProfile(req.user.id, req.body, req);
      successResponse(res, customer, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const addresses = await customerService.getAddresses(req.user.customer.id);
      successResponse(res, addresses);
    } catch (error) {
      next(error);
    }
  }

  async createAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const address = await customerService.createAddress(req.user.customer.id, req.body, req);
      createdResponse(res, address, 'Address created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const address = await customerService.updateAddress(req.params.id, req.user.customer.id, req.body, req);
      successResponse(res, address, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      await customerService.deleteAddress(req.params.id, req.user.customer.id, req);
      successResponse(res, null, 'Address deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.customer?.id) {
        return res.status(403).json({ success: false, message: 'Customer profile not found' });
      }

      const { page = 1, limit = 10 } = req.query;
      const result = await customerService.getOrders(req.user.customer.id, {
        page: Number(page),
        limit: Number(limit),
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();