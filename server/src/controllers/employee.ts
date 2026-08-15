import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class EmployeeController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.create(req.body, req);
      createdResponse(res, employee, 'Employee created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, isActive } = req.query;
      const result = await employeeService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        isActive: isActive as boolean | undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Employees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.findById(req.params.id);
      successResponse(res, employee);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.update(req.params.id, req.body, req);
      successResponse(res, employee, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await employeeService.resetPassword(req.params.id, req.body.password, req);
      successResponse(res, null, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();