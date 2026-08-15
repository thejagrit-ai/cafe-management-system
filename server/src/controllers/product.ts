import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class ProductController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body, req);
      createdResponse(res, product, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder, search, categoryId, availability, isFeatured, isPopular } = req.query;
      const result = await productService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        categoryId: categoryId as string,
        availability: availability as string,
        // Already parsed to boolean | undefined by the query validator.
        // Comparing the raw string here would send `false` (not `undefined`)
        // when the parameter is absent, silently filtering the list down to
        // non-featured, non-popular products.
        isFeatured: isFeatured as boolean | undefined,
        isPopular: isPopular as boolean | undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total }, 'Products retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.findById(req.params.id);
      successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(req.params.id, req.body, req);
      successResponse(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await productService.delete(req.params.id, req);
      successResponse(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const products = await productService.getFeatured(limit);
      successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  async getPopular(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const products = await productService.getPopular(limit);
      successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await productService.getByCategory(req.params.categoryId, {
        page: Number(page),
        limit: Number(limit),
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();