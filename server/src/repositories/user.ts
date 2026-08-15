import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { User, Role, Customer, Employee, Prisma } from '@prisma/client';

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput, Prisma.UserWhereInput> {
  protected model = prisma.user;

  async findByEmail(email: string): Promise<User | null> {
    return this.model.findUnique({ where: { email } });
  }

  async findByEmailWithRelations(email: string): Promise<(User & { customer: Customer | null; employee: Employee | null }) | null> {
    return this.model.findUnique({
      where: { email },
      include: { customer: true, employee: true },
    });
  }

  async findByIdWithRelations(id: string): Promise<(User & { customer: Customer | null; employee: Employee | null }) | null> {
    return this.model.findUnique({
      where: { id },
      include: { customer: true, employee: true },
    });
  }

  async findByRole(role: Role, options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    return this.findMany({ ...options, where: { role } });
  }

  async updateLastLogin(id: string): Promise<User> {
    return this.model.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}

export const userRepository = new UserRepository();