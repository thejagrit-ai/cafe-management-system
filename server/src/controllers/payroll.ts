import { Response, NextFunction } from 'express';
import { payrollService } from '../services/payroll';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class PayrollController {
  async summary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { dateFrom, dateTo, deductionPercent = 0 } = req.query;
      const result = await payrollService.summary({
        dateFrom: dateFrom ? new Date(dateFrom as any) : undefined,
        dateTo: dateTo ? new Date(dateTo as any) : undefined,
        deductionPercent: Number(deductionPercent),
      });
      successResponse(res, result, 'Payroll summary retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateCompensation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await payrollService.updateCompensation(req.params.employeeId, req.body);
      successResponse(res, employee, 'Compensation updated');
    } catch (error) {
      next(error);
    }
  }
}

export const payrollController = new PayrollController();
