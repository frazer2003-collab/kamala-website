export const DESK_STOCK_MOVEMENT_REASONS = [
  "opening",
  "purchase",
  "bill_sale",
  "waste",
  "adjustment",
] as const;

export type DeskStockMovementReason =
  (typeof DESK_STOCK_MOVEMENT_REASONS)[number];

export type StockMovementQuantity = {
  quantity: number;
};

export type StockHeadroomItem = {
  onHand: number;
  minimum: number;
};

export type MealIngredientAvailability = StockHeadroomItem & {
  quantityPerMeal: number;
};

export function onHand(
  openingQuantity: number,
  movements: readonly StockMovementQuantity[],
): number {
  return movements.reduce(
    (total, movement) => total + movement.quantity,
    openingQuantity,
  );
}

export function headroom(
  currentOnHand: number,
  minimum: number,
): number {
  return currentOnHand - minimum;
}

export function sortByShortestHeadroom<T extends StockHeadroomItem>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (left, right) =>
      headroom(left.onHand, left.minimum) -
      headroom(right.onHand, right.minimum),
  );
}

export function mealsLeft(
  ingredients: readonly MealIngredientAvailability[],
): number {
  if (ingredients.length === 0) {
    return 0;
  }

  return ingredients.reduce((fewest, ingredient) => {
    if (ingredient.quantityPerMeal <= 0) {
      throw new RangeError("Ingredient quantity per meal must be positive.");
    }

    const portions = Math.max(
      0,
      Math.floor(
        headroom(ingredient.onHand, ingredient.minimum) /
          ingredient.quantityPerMeal,
      ),
    );
    return Math.min(fewest, portions);
  }, Number.POSITIVE_INFINITY);
}
