import { Response, NextFunction } from 'express';
import { walletService } from '../services/wallet';
import { createdResponse, paginatedResponse, successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { AuthorizationError } from '../utils/errors';

function requireCustomerId(req: AuthenticatedRequest) {
  const customerId = req.user?.customer?.id;
  if (!customerId) throw new AuthorizationError('Customer profile not found');
  return customerId;
}

export class WalletController {
  async getWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await walletService.getWallet(requireCustomerId(req)));
    } catch (error) {
      next(error);
    }
  }

  async redeemGiftCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      successResponse(res, await walletService.redeemGiftCard(requireCustomerId(req), req.body.code), 'Gift card redeemed');
    } catch (error) {
      next(error);
    }
  }

  async listGiftCards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const result = await walletService.listGiftCards({ page: Number(page), limit: Number(limit), status: status as string });
      paginatedResponse(res, result.data, { page: result.page, limit: result.limit, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  async createGiftCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      createdResponse(res, await walletService.createGiftCard(req.body), 'Gift card created');
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();
