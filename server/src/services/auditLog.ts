import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class AuditLogService {
  async findAll(params: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    entity?: string;
    action?: string;
  }) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, entity, action } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { entity: { contains: search, mode: 'insensitive' } },
              { entityId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditLogService = new AuditLogService();
