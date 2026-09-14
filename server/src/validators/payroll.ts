import { z } from 'zod';

const payrollType = z.enum(['HOURLY', 'MONTHLY']);

export const payrollSummaryQuerySchema = z.object({
  query: z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    deductionPercent: z.coerce.number().min(0).max(80).default(0),
  }),
});

export const compensationParamSchema = z.object({
  params: z.object({
    employeeId: z.string().cuid(),
  }),
});

export const compensationBodySchema = z.object({
  body: z.object({
    payrollType,
    hourlyRate: z.coerce.number().min(0).max(100000),
    monthlySalary: z.coerce.number().min(0).max(10000000),
  }),
});
