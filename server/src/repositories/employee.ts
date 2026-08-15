import prisma from '../config/prisma';
import { BaseRepository } from './base';
import { Employee, Prisma } from '@prisma/client';

export class EmployeeRepository extends BaseRepository<Employee, Prisma.EmployeeCreateInput, Prisma.EmployeeUpdateInput, Prisma.EmployeeWhereInput> {
  protected model = prisma.employee;

  async findActive(): Promise<Employee[]> {
    return this.model.findMany({
      where: { isActive: true },
      include: { user: true },
    });
  }
}

export const employeeRepository = new EmployeeRepository();