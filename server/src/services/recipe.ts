import { recipeRepository } from '../repositories/recipe';
import { productRepository } from '../repositories/product';
import { ingredientRepository } from '../repositories/ingredient';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, ConflictError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

export class RecipeService {
  async create(data: { productId: string; instructions?: string; prepTime?: number; cookTime?: number; servings?: number; ingredients: Array<{ ingredientId: string; quantity: number; unit: string; notes?: string }> }, req: AuthenticatedRequest) {
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new NotFoundError('Product');
    }

    const existingRecipe = await recipeRepository.findByProductId(data.productId);
    if (existingRecipe) {
      throw new ConflictError('Recipe already exists for this product');
    }

    for (const ing of data.ingredients) {
      const ingredient = await ingredientRepository.findById(ing.ingredientId);
      if (!ingredient) {
        throw new NotFoundError(`Ingredient ${ing.ingredientId}`);
      }
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: {
          productId: data.productId,
          instructions: data.instructions,
          prepTime: data.prepTime ?? 0,
          cookTime: data.cookTime ?? 0,
          servings: data.servings ?? 1,
          ingredients: {
            create: data.ingredients.map((ing) => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
            })),
          },
        },
        include: { ingredients: { include: { ingredient: true } } },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Recipe',
        entityId: newRecipe.id,
        newData: newRecipe,
        ...getAuditDataFromRequest(req),
      });

      return newRecipe;
    });

    return recipe;
  }

  async findByProductId(productId: string) {
    const recipe = await recipeRepository.findByProductId(productId);
    if (!recipe) {
      throw new NotFoundError('Recipe');
    }
    return recipe;
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { product: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    return recipeRepository.findMany({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const recipe = await recipeRepository.findWithDetails(id);
    if (!recipe) {
      throw new NotFoundError('Recipe');
    }
    return recipe;
  }

  async update(id: string, data: any, req: AuthenticatedRequest) {
    const existing = await recipeRepository.findWithDetails(id);
    if (!existing) {
      throw new NotFoundError('Recipe');
    }

    if (data.ingredients) {
      for (const ing of data.ingredients) {
        const ingredient = await ingredientRepository.findById(ing.ingredientId);
        if (!ingredient) {
          throw new NotFoundError(`Ingredient ${ing.ingredientId}`);
        }
      }
    }

    const recipe = await prisma.$transaction(async (tx) => {
      if (data.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      }

      const updated = await tx.recipe.update({
        where: { id },
        data: {
          instructions: data.instructions,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          ingredients: data.ingredients ? {
            create: data.ingredients.map((ing: any) => ({
              ingredientId: ing.ingredientId,
              quantity: ing.quantity,
              unit: ing.unit,
              notes: ing.notes,
            })),
          } : undefined,
        },
        include: { ingredients: { include: { ingredient: true } }, product: true },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Recipe',
        entityId: id,
        oldData: existing,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return recipe;
  }

  async delete(id: string, req: AuthenticatedRequest) {
    const existing = await recipeRepository.findWithDetails(id);
    if (!existing) {
      throw new NotFoundError('Recipe');
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.delete({ where: { id } });

      await createAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Recipe',
        entityId: id,
        oldData: existing,
        ...getAuditDataFromRequest(req),
      });
    });
  }

  async checkStockAvailability(productId: string, quantity: number) {
    return recipeRepository.checkStockAvailability(productId, quantity);
  }
}

export const recipeService = new RecipeService();