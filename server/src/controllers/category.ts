import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class CategoryController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.body, req);
      createdResponse(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, isActive } = req.query;
      const result = await categoryService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        isActive: isActive as boolean | undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAllActive(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.findAllActive();
      successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.findById(req.params.id);
      successResponse(res, category);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(req.params.id, req.body, req);
      successResponse(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await categoryService.delete(req.params.id, req);
      successResponse(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();