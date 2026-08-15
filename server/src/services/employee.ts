import { userRepository } from '../repositories/user';
import { employeeRepository } from '../repositories/employee';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, ConflictError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { hashPassword } from '../utils/helpers';
import prisma from '../config/prisma';

export class EmployeeService {
  async create(data: { email: string; password: string; firstName: string; lastName: string; phone?: string; position?: string }, req: AuthenticatedRequest) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const employee = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: 'STAFF',
        },
      });

      const newEmployee = await tx.employee.create({
        data: {
          userId: newUser.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          position: data.position,
        },
        include: { user: true },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Employee',
        entityId: newEmployee.id,
        newData: { ...newEmployee, user: { email: newUser.email, role: newUser.role } },
        ...getAuditDataFromRequest(req),
      });

      return newEmployee;
    });

    return employee;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; isActive?: boolean }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    if (params.isActive !== undefined) where.isActive = params.isActive;

    return employeeRepository.findMany({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where: where as any,
    });
  }

  async findById(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee');
    }
    return employee;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await employeeRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Employee');
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data,
        include: { user: true },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Employee',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return employee;
  }

  async resetPassword(id: string, password: string, req: AuthenticatedRequest) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee');
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: employee.userId },
        data: { passwordHash },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'RESET_PASSWORD',
        entity: 'Employee',
        entityId: id,
        ...getAuditDataFromRequest(req),
      });
    });
  }
}

export const employeeService = new EmployeeService();