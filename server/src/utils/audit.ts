import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../types';

export interface AuditLogData {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldData: data.oldData as any,
        newData: data.newData as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Callers sometimes pass a synthetic request (e.g. the login flow, which only
// has the user), so every field below is treated as optional.
export function getAuditDataFromRequest(req: Partial<AuthenticatedRequest>): Partial<AuditLogData> {
  return {
    userId: req.user?.id,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: typeof req.get === 'function' ? req.get('user-agent') : undefined,
  };
}