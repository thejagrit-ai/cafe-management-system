import prisma from '../config/prisma';
import { BaseRepository } from './base';
import { Recipe, Prisma } from '@prisma/client';

export class RecipeRepository extends BaseRepository<Recipe, Prisma.RecipeCreateInput, Prisma.RecipeUpdateInput, Prisma.RecipeWhereInput> {
  protected model = prisma.recipe;

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