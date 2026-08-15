import prisma from '../config/prisma';
import { BaseRepository } from './base';
import { Supplier, Prisma } from '@prisma/client';

export class SupplierRepository extends BaseRepository<Supplier, Prisma.SupplierCreateInput, Prisma.SupplierUpdateInput, Prisma.SupplierWhereInput> {
  protected model = prisma.supplier;

  async findAllActive(): Promise<Supplier[]> {
    return this.model.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

export const supplierRepository = new SupplierRepository();