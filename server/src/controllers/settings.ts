import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class SettingsController {
  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.find();
      successResponse(res, settings);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.update(req.body, req);
      successResponse(res, settings, 'Settings updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();