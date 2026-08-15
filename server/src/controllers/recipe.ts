import { Request, Response, NextFunction } from 'express';
import { recipeService } from '../services/recipe';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class RecipeController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const recipe = await recipeService.create(req.body, req);
      createdResponse(res, recipe, 'Recipe created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findByProductId(req: Request, res: Response, next: NextFunction) {
    try {
      const recipe = await recipeService.findByProductId(req.params.productId);
      successResponse(res, recipe);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search } = req.query;
      const result = await recipeService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Recipes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const recipe = await recipeService.findById(req.params.id);
      successResponse(res, recipe);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const recipe = await recipeService.update(req.params.id, req.body, req);
      successResponse(res, recipe, 'Recipe updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await recipeService.delete(req.params.id, req);
      successResponse(res, null, 'Recipe deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkStock(req: Request, res: Response, next: NextFunction) {
    try {
      const quantity = req.query.quantity ? Number(req.query.quantity) : 1;
      const result = await recipeService.checkStockAvailability(req.params.productId, quantity);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const recipeController = new RecipeController();