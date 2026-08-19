import prisma from '../config/prisma';
import { BaseRepository, PaginationOptions, PaginatedResult } from './base';
import { Recipe, Prisma } from '@prisma/client';

export class RecipeRepository extends BaseRepository<Recipe, Prisma.RecipeCreateInput, Prisma.RecipeUpdateInput, Prisma.RecipeWhereInput> {
  protected model = prisma.recipe;

  /**
   * Recipe cards are titled by their product and the edit dialog is seeded
   * from the existing ingredient rows. The base implementation returned
   * neither, so every card read "Producto vinculado" and opening Edit
   * presented an empty ingredient list — saving from there wiped the recipe.
   */
  override async findMany(
    options: PaginationOptions & { where?: Prisma.RecipeWhereInput }
  ): Promise<PaginatedResult<Recipe>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', where } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { ingredients: { include: { ingredient: true } }, product: true },
      }),
      this.model.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByProductId(productId: string): Promise<(Recipe & { ingredients: (Prisma.RecipeIngredientGetPayload<{ include: { ingredient: true } }>)[] }) | null> {
    return this.model.findUnique({
      where: { productId },
      include: { ingredients: { include: { ingredient: true } } },
    });
  }

  async findWithDetails(id: string): Promise<(Recipe & { ingredients: (Prisma.RecipeIngredientGetPayload<{ include: { ingredient: true } }>)[]; product: any }) | null> {
    return this.model.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } }, product: true },
    });
  }

  async checkStockAvailability(productId: string, quantity: number): Promise<{ available: boolean; missingIngredients: Array<{ ingredient: string; required: number; available: number }> }> {
    const recipe = await this.findByProductId(productId);
    if (!recipe) return { available: true, missingIngredients: [] };

    const missingIngredients: Array<{ ingredient: string; required: number; available: number }> = [];

    for (const ri of recipe.ingredients) {
      const required = Number(ri.quantity) * quantity;
      const available = Number(ri.ingredient.currentStock);
      if (available < required) {
        missingIngredients.push({
          ingredient: ri.ingredient.name,
          required,
          available,
        });
      }
    }

    return {
      available: missingIngredients.length === 0,
      missingIngredients,
    };
  }
}

export const recipeRepository = new RecipeRepository();