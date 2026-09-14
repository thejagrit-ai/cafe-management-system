import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { NotFoundError } from '../utils/errors';

type PayrollType = 'HOURLY' | 'MONTHLY';

interface PayrollSummaryParams {
  dateFrom?: Date;
  dateTo?: Date;
  deductionPercent: number;
}

interface CompensationInput {
  payrollType: PayrollType;
  hourlyRate: number;
  monthlySalary: number;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export class PayrollService {
  async summary(params: PayrollSummaryParams) {
    const dateFrom = params.dateFrom ?? startOfMonth();
    const dateTo = params.dateTo ?? endOfMonth(dateFrom);
    const deductionPercent = params.deductionPercent ?? 0;

    const rows = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      position: string | null;
      isActive: boolean;
      payrollType: PayrollType;
      hourlyRate: Prisma.Decimal;
      monthlySalary: Prisma.Decimal;
      shiftCount: bigint;
      totalMinutes: Prisma.Decimal | number | string | null;
    }>>`
      SELECT
        e."id",
        e."firstName",
        e."lastName",
        e."position",
        e."isActive",
        e."payrollType",
        e."hourlyRate",
        e."monthlySalary",
        COUNT(s."id")::bigint AS "shiftCount",
        COALESCE(
          SUM(
            GREATEST(
              EXTRACT(EPOCH FROM (s."clockOutAt" - s."clockInAt")) / 60 - s."breakMinutes",
              0
            )
          ),
          0
        ) AS "totalMinutes"
      FROM "employees" e
      LEFT JOIN "employee_shifts" s
        ON s."employeeId" = e."id"
       AND s."status" = 'CLOSED'
       AND s."clockInAt" >= ${dateFrom}
       AND s."clockInAt" <= ${dateTo}
      GROUP BY e."id"
      ORDER BY e."firstName" ASC, e."lastName" ASC
    `;

    const employees = rows.map((row) => {
      const totalHours = round2(Number(row.totalMinutes ?? 0) / 60);
      const hourlyRate = Number(row.hourlyRate);
      const monthlySalary = Number(row.monthlySalary);
      const grossPay = row.payrollType === 'MONTHLY' ? monthlySalary : round2(totalHours * hourlyRate);
      const deductions = round2(grossPay * (deductionPercent / 100));
      const netPay = round2(grossPay - deductions);

      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        position: row.position,
        isActive: row.isActive,
        payrollType: row.payrollType,
        hourlyRate,
        monthlySalary,
        shiftCount: Number(row.shiftCount),
        totalHours,
        grossPay,
        deductions,
        netPay,
      };
    });

    return {
      period: {
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        deductionPercent,
      },
      summary: {
        employees: employees.length,
        totalHours: round2(employees.reduce((sum, item) => sum + item.totalHours, 0)),
        grossPay: round2(employees.reduce((sum, item) => sum + item.grossPay, 0)),
        deductions: round2(employees.reduce((sum, item) => sum + item.deductions, 0)),
        netPay: round2(employees.reduce((sum, item) => sum + item.netPay, 0)),
      },
      employees,
    };
  }

  async updateCompensation(employeeId: string, data: CompensationInput) {
    const existing = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
    if (!existing) throw new NotFoundError('Employee');

    return prisma.employee.update({
      where: { id: employeeId },
      data: {
        payrollType: data.payrollType,
        hourlyRate: data.hourlyRate,
        monthlySalary: data.monthlySalary,
      },
      include: { user: true },
    });
  }
}

export const payrollService = new PayrollService();
