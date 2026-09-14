import { Response, NextFunction } from 'express';
import { customerEngagementService } from '../services/customerEngagement';
import { createdResponse, paginatedResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';

function requireCustomerId(req: AuthenticatedRequest) {
  const customerId = req.user?.customer?.id;
  if (!customerId) throw new AuthorizationError('Customer profile not found');
  return customerId;
}

export class CustomerEngagementController {
  async listFavorites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await customerEngagementService.listFavorites(requireCustomerId(req)));
    } catch (error) {
      next(error);
    }
  }

  async addFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await customerEngagementService.addFavorite(requireCustomerId(req), req.body.productId, req.body.notes));
    } catch (error) {
      next(error);
    }
  }

  async removeFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await customerEngagementService.removeFavorite(requireCustomerId(req), req.params.productId);
      successResponse(res, null, 'Favorite removed');
    } catch (error) {
      next(error);
    }
  }

  async listReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, productId } = req.query;
      const result = await customerEngagementService.listReviews({
        page: Number(page),
        limit: Number(limit),
        productId: productId as string,
        customerId: req.user?.role === 'CUSTOMER' ? req.user.customer?.id : undefined,
      });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await customerEngagementService.createReview(requireCustomerId(req), req.body), 'Review submitted');
    } catch (error) {
      next(error);
    }
  }

  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await customerEngagementService.getReviewSummary(req.query.productId as string));
    } catch (error) {
      next(error);
    }
  }
}

export const customerEngagementController = new CustomerEngagementController();
