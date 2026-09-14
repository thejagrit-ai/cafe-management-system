import { Response, NextFunction } from 'express';
import { auditLogService } from '../services/auditLog';
import { paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AuditLogController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, sortBy, sortOrder, search, entity, action } = req.query;
      const result = await auditLogService.findAll({
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
        entity: entity as string,
        action: action as string,
      });

      paginatedResponse(res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogController = new AuditLogController();
