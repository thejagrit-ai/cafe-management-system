import { Request, Response, NextFunction } from 'express';
import { ingredientService } from '../services/ingredient';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { InventoryTransactionType } from '@prisma/client';

export class IngredientController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ingredient = await ingredientService.create(req.body, req);
      createdResponse(res, ingredient, 'Ingredient created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, isActive, lowStock } = req.query;
      const result = await ingredientService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        isActive: isActive as boolean | undefined,
        lowStock: lowStock as boolean | undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Ingredients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const ingredient = await ingredientService.findById(req.params.id);
      successResponse(res, ingredient);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ingredient = await ingredientService.update(req.params.id, req.body, req);
      successResponse(res, ingredient, 'Ingredient updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { type, quantity, unitCost, notes } = req.body;
      const ingredient = await ingredientService.adjustStock(req.params.id, { type: type as InventoryTransactionType, quantity, unitCost, notes }, req);
      successResponse(res, ingredient, 'Stock adjusted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const ingredients = await ingredientService.getLowStock();
      successResponse(res, ingredients);
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, type, dateFrom, dateTo } = req.query;
      const result = await ingredientService.getTransactions(req.params.id, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        type: type as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }
}

export const ingredientController = new IngredientController();