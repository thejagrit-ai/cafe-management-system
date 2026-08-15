import { supplierRepository } from '../repositories/supplier';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

export class SupplierService {
  async create(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string }, req: AuthenticatedRequest) {
    const supplier = await prisma.$transaction(async (tx) => {
      const newSupplier = await tx.supplier.create({
        data: {
          name: data.name,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          address: data.address,
        },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Supplier',
        entityId: newSupplier.id,
        newData: newSupplier,
        ...getAuditDataFromRequest(req),
      });

      return newSupplier;
    });

    return supplier;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; isActive?: boolean }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { contactName: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.isActive !== undefined) where.isActive = params.isActive;

    return supplierRepository.findMany({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier');
    }
    return supplier;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Supplier');
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({
        where: { id },
        data,
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Supplier',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return supplier;
  }

  async findAllActive() {
    return supplierRepository.findAllActive();
  }
}

export const supplierService = new SupplierService();