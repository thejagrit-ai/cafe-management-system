import { productRepository } from '../repositories/product';
import { categoryRepository } from '../repositories/category';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

export class ProductService {
  async create(data: { name: string; description?: string; price: number; imageUrl?: string; categoryId: string; availability?: string; isFeatured?: boolean; isPopular?: boolean; sortOrder?: number }, req: AuthenticatedRequest) {
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category');
    }

    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          imageUrl: data.imageUrl,
          categoryId: data.categoryId,
          availability: data.availability as any,
          isFeatured: data.isFeatured ?? false,
          isPopular: data.isPopular ?? false,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Product',
        entityId: newProduct.id,
        newData: newProduct,
        ...getAuditDataFromRequest(req),
      });

      return newProduct;
    });

    return product;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; categoryId?: string; availability?: string; isFeatured?: boolean; isPopular?: boolean }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.availability) where.availability = params.availability;
    if (params.isFeatured !== undefined) where.isFeatured = params.isFeatured;
    if (params.isPopular !== undefined) where.isPopular = params.isPopular;

    return productRepository.findMany({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const product = await productRepository.findWithDetails(id);
    if (!product) {
      throw new NotFoundError('Product');
    }
    return product;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product');
    }

    if (data.categoryId) {
      const category = await categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new NotFoundError('Category');
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data,
        include: { category: true, recipe: { include: { ingredients: { include: { ingredient: true } } } } },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Product',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return product;
  }

  async delete(id: string, req: AuthenticatedRequest) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product');
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });

      await createAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Product',
        entityId: id,
        oldData: existing,
        ...getAuditDataFromRequest(req),
      });
    });
  }

  async getFeatured(limit: number = 10) {
    return productRepository.findFeatured(limit);
  }

  async getPopular(limit: number = 10) {
    return productRepository.findPopular(limit);
  }

  async getByCategory(categoryId: string, params: { page: number; limit: number }) {
    return productRepository.findByCategory(categoryId, params);
  }
}

export const productService = new ProductService();