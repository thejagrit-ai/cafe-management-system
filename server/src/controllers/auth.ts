import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { successResponse, createdResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.register(req.body);
      const { passwordHash, ...userWithoutPassword } = user;
      
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      createdResponse(res, { user: userWithoutPassword, tokens }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await authService.login(req.body.email, req.body.password);
      const { passwordHash, ...userWithoutPassword } = user;

      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      successResponse(res, { user: userWithoutPassword, tokens }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await authService.logout(req, refreshToken);

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      successResponse(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      successResponse(res, tokens, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { passwordHash, ...userWithoutPassword } = req.user!;
      successResponse(res, userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      successResponse(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Profile updates handled by customer/employee services
      successResponse(res, null, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();