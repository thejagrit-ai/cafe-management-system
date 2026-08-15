import { Response, NextFunction } from 'express';
import { loyaltyService, POINT_REDEMPTION_VALUE, LOYALTY_TIERS } from '../services/loyalty';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { BadRequestError } from '../utils/errors';

export class LoyaltyController {
  async getMyLoyalty(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.user?.customer?.id;
      if (!customerId) {
        throw new BadRequestError('Customer profile required');
      }

      const loyalty = await loyaltyService.getCustomerLoyalty(customerId);
      successResponse(res, loyalty);
    } catch (error) {
      next(error);
    }
  }

  async getTiers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, {
        tiers: LOYALTY_TIERS,
        redemptionValuePerPoint: POINT_REDEMPTION_VALUE,
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustPoints(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, points, reason } = req.body;
      if (!customerId || points === undefined) {
        throw new BadRequestError('Customer ID and points are required');
      }

      await loyaltyService.adjustPoints(customerId, Number(points), reason);
      successResponse(res, null, 'Points adjusted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const loyaltyController = new LoyaltyController();
