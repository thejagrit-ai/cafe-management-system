import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { AuditLog, Prisma } from '@prisma/client';

export class AuditLogRepository extends BaseRepository<AuditLog, Prisma.AuditLogCreateInput, Prisma.AuditLogUpdateInput, Prisma.AuditLogWhereInput> {
  protected model = prisma.auditLog;

  async findByEntity(entity: string, entityId: string, options: PaginationOptions = {}): Promise<PaginatedResult<AuditLog>> {
    return this.findMany({
      ...options,
      where: { entity, entityId, ...options.where },
    });
  }

  async findByUser(userId: string, options: PaginationOptions = {}): Promise<PaginatedResult<AuditLog>> {
    return this.findMany({
      ...options,
      where: { userId, ...options.where },
    });
  }
}

export const auditLogRepository = new AuditLogRepository();