import { Prisma, ProductAvailability } from '@prisma/client';
import { eventHub } from '../utils/eventHub';
import prisma from '../config/prisma';

/**
 * Keeps the menu and the stock alerts honest as ingredients move.
 *
 * Two things were missing before this existed:
 *
 * 1. Product availability was a purely manual column. Nothing recomputed it
 *    when a recipe's ingredients ran out, so the storefront kept advertising
 *    drinks the bar could not make; the customer only found out when checkout
 *    rejected the order with an "insufficient stock" error.
 *
 * 2. Low-stock warnings were only broadcast from the admin inventory screen.
 *    Stock consumed by actual sales - the way stock is normally consumed -
 *    emitted a bare `{ orderId }`, which carries none of the fields the
 *    client's toast reads, so the alert never fired from real trade.
 */

/** Servings still makeable at or below which an item is flagged LIMITED. */
const LIMITED_SERVINGS_THRESHOLD = 5;

export interface StockAlert {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  isLowStock: boolean;
}

/**
 * Recomputes `availability` for every product whose recipe uses one of the
 * given ingredients. Runs inside the caller's transaction so an order and the
 * menu state it implies commit together.
 *
 * Products flagged `availabilityLocked` are skipped: that flag means a person
 * chose the current state deliberately.
 */
export async function syncAvailabilityForIngredients(
  tx: Prisma.TransactionClient,
  ingredientIds: string[]
): Promise<void> {
  if (ingredientIds.length === 0) return;

  const recipes = await tx.recipe.findMany({
    where: { ingredients: { some: { ingredientId: { in: ingredientIds } } } },
    select: {
      productId: true,
      product: { select: { availability: true, availabilityLocked: true } },
      ingredients: {
        select: {
          quantity: true,
          ingredient: { select: { currentStock: true, isActive: true } },
        },
      },
    },
  });

  for (const recipe of recipes) {
    if (recipe.product.availabilityLocked) continue;

    const next = availabilityFor(recipe.ingredients);
    if (next === recipe.product.availability) continue;

    await tx.product.update({
      where: { id: recipe.productId },
      data: { availability: next },
    });
  }
}

/** How many servings the ingredients on hand support, mapped to a status. */
function availabilityFor(
  ingredients: Array<{
    quantity: Prisma.Decimal | number;
    ingredient: { currentStock: Prisma.Decimal | number; isActive: boolean };
  }>
): ProductAvailability {
  let servings = Infinity;

  for (const line of ingredients) {
    const perServing = Number(line.quantity);
    // A recipe line that consumes nothing cannot limit production, and
    // dividing by it would yield Infinity and mask a genuine shortage.
    if (!Number.isFinite(perServing) || perServing <= 0) continue;

    // A de-activated ingredient is one the café has stopped stocking, so
    // anything depending on it cannot be made regardless of the number left.
    if (!line.ingredient.isActive) return ProductAvailability.UNAVAILABLE;

    servings = Math.min(servings, Math.floor(Number(line.ingredient.currentStock) / perServing));
  }

  // No recipe lines that consume anything: nothing to infer, leave it sellable.
  if (!Number.isFinite(servings)) return ProductAvailability.AVAILABLE;

  if (servings <= 0) return ProductAvailability.UNAVAILABLE;
  if (servings <= LIMITED_SERVINGS_THRESHOLD) return ProductAvailability.LIMITED;
  return ProductAvailability.AVAILABLE;
}

/**
 * Broadcasts the post-change level of each ingredient that moved, in the shape
 * the client's INVENTORY_UPDATED handler actually reads, so a sale that takes
 * an ingredient under its minimum raises the same warning a manual adjustment
 * does. Call after the transaction commits - the numbers must be the
 * committed ones.
 */
export async function announceStockLevels(ingredientIds: string[]): Promise<void> {
  if (ingredientIds.length === 0) return;

  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: { id: true, name: true, currentStock: true, minStock: true, unit: true },
  });

  for (const ingredient of ingredients) {
    const alert: StockAlert = {
      id: ingredient.id,
      name: ingredient.name,
      currentStock: Number(ingredient.currentStock),
      minStock: Number(ingredient.minStock),
      unit: ingredient.unit,
      isLowStock: Number(ingredient.currentStock) <= Number(ingredient.minStock),
    };

    eventHub.broadcast('INVENTORY_UPDATED', alert, ['ADMIN', 'STAFF']);
  }
}
