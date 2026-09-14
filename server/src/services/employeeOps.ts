import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

export const STAFF_PERMISSIONS = [
  'ORDERS_MANAGE',
  'PAYMENTS_RECORD',
  'INVENTORY_ADJUST',
  'PRODUCT_AVAILABILITY',
  'REPORTS_VIEW',
] as const;

export class EmployeeOpsService {
  async listShifts(params: { page: number; limit: number; employeeId?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    const clauses: Prisma.Sql[] = [];
    if (params.employeeId) clauses.push(Prisma.sql`s."employeeId" = ${params.employeeId}`);
    if (params.status) clauses.push(Prisma.sql`s."status"::text = ${params.status}`);
    const where = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;

    const rows = await prisma.$queryRaw`
      SELECT s.*, e."firstName", e."lastName"
      FROM "employee_shifts" s
      JOIN "employees" e ON e."id" = s."employeeId"
      ${where}
      ORDER BY s."clockInAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "employee_shifts" s ${where}`;
    const total = Number(totalRows[0]?.count ?? 0);
    return { data: rows as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async currentShift(employeeId: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT * FROM "employee_shifts"
      WHERE "employeeId" = ${employeeId} AND "status" = 'OPEN'
      ORDER BY "clockInAt" DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async clockIn(employeeId: string, notes?: string) {
    const existing = await this.currentShift(employeeId);
    if (existing) throw new ConflictError('Employee already has an open shift');

    const rows = await prisma.$queryRaw`
      INSERT INTO "employee_shifts" ("id", "employeeId", "notes", "status", "createdAt", "updatedAt")
      VALUES (${crypto.randomUUID()}, ${employeeId}, ${notes ?? null}, 'OPEN', NOW(), NOW())
      RETURNING *
    `;
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async clockOut(employeeId: string, data: { breakMinutes?: number; notes?: string }) {
    const shift = await this.currentShift(employeeId);
    if (!shift) throw new NotFoundError('Open shift');

    const rows = await prisma.$queryRaw`
      UPDATE "employee_shifts"
      SET "clockOutAt" = NOW(),
          "breakMinutes" = ${data.breakMinutes ?? shift.breakMinutes ?? 0},
          "notes" = ${data.notes ?? shift.notes ?? null},
          "status" = 'CLOSED',
          "updatedAt" = NOW()
      WHERE "id" = ${shift.id}
      RETURNING *
    `;
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async getPermissions(employeeId: string) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!employee) throw new NotFoundError('Employee');

    const rows = await prisma.$queryRaw<Array<{ permission: string; enabled: boolean }>>`
      SELECT "permission", "enabled" FROM "employee_permissions" WHERE "employeeId" = ${employeeId}
    `;
    const map = new Map(rows.map((row) => [row.permission, row.enabled]));
    return STAFF_PERMISSIONS.map((permission) => ({
      permission,
      enabled: map.get(permission) ?? true,
    }));
  }

  async setPermissions(employeeId: string, permissions: Array<{ permission: string; enabled: boolean }>) {
    const invalid = permissions.find((item) => !STAFF_PERMISSIONS.includes(item.permission as any));
    if (invalid) throw new BadRequestError(`Unknown permission: ${invalid.permission}`);

    await prisma.$transaction(async (tx) => {
      for (const item of permissions) {
        await tx.$executeRaw`
          INSERT INTO "employee_permissions" ("id", "employeeId", "permission", "enabled", "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${employeeId}, ${item.permission}, ${item.enabled}, NOW(), NOW())
          ON CONFLICT ("employeeId", "permission")
          DO UPDATE SET "enabled" = EXCLUDED."enabled", "updatedAt" = NOW()
        `;
      }
    });

    return this.getPermissions(employeeId);
  }

  async hasPermission(employeeId: string, permission: string) {
    const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
      SELECT "enabled" FROM "employee_permissions"
      WHERE "employeeId" = ${employeeId} AND "permission" = ${permission}
      LIMIT 1
    `;
    return rows[0]?.enabled ?? true;
  }
}

export const employeeOpsService = new EmployeeOpsService();
