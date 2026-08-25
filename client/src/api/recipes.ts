import { api } from './client';
import type { Recipe } from '../types';

export interface StockCheck {
  available: boolean;
  missingIngredients: Array<{
    ingredient: string;
    /** Total needed for the requested quantity. */
    required: number;
    /** How much of that ingredient is actually on hand. */
    available: number;
  }>;
}

export const recipesApi = {
  getByProduct: (productId: string) => api.get<Recipe>(`/recipes/product/${productId}`),

  /**
   * Asks whether the café can currently make `quantity` of a product.
   *
   * Product availability alone only says whether at least one can be made, so a
   * customer could still put six of something in the basket and only find out
   * at checkout that the kitchen has beans for two.
   */
  checkStock: (productId: string, quantity: number) =>
    api.get<StockCheck>(`/recipes/${productId}/check-stock`, { quantity }),
};
