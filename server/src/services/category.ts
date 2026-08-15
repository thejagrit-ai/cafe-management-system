import { categoryRepository } from '../repositories/category';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

export class CategoryService {
  async create(data: { name: string; description?: string; imageUrl?: string; sortOrder?: number }, req: AuthenticatedRequest) {
    const sortOrder = data.sortOrder ?? await categoryRepository.getMaxDisplayOrder();

    const category = await prisma.$transaction(async (tx) => {
      const newCategory = await tx.category.create({
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          sortOrder,
        },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Category',
        entityId: newCategory.id,
        newData: newCategory,
        ...getAuditDataFromRequest(req),
      });

      return newCategory;
    });

    return category;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; isActive?: boolean }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.isActive !== undefined) where.isActive = params.isActive;

    return categoryRepository.findWithProductCount({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where: where as any,
    });
  }

  async findAllActive() {
    return categoryRepository.findAllActive();
  }

  async findById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category');
    }
    return category;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category');
    }

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data,
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Category',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return category;
  }

  async delete(id: string, req: AuthenticatedRequest) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category');
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new Error('Cannot delete category with existing products');
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });

      await createAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Category',
        entityId: id,
        oldData: existing,
        ...getAuditDataFromRequest(req),
      });
    });
  }
}

export const categoryService = new CategoryService();