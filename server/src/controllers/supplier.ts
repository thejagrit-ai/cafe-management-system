import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplier';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class SupplierController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.create(req.body, req);
      createdResponse(res, supplier, 'Supplier created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, isActive } = req.query;
      const result = await supplierService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        isActive: isActive as boolean | undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Suppliers retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.findById(req.params.id);
      successResponse(res, supplier);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.update(req.params.id, req.body, req);
      successResponse(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAllActive(req: Request, res: Response, next: NextFunction) {
    try {
      const suppliers = await supplierService.findAllActive();
      successResponse(res, suppliers);
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();