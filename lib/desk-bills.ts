import type { DeskStockMovementReason } from "./desk-stock";

export type DeskBillStatus = "open" | "cleared";

export type DeskBillLine = {
  id?: string;
  sellableItemId: string;
  quantity: number;
};

export type DeskSellableForBill = {
  id: string;
  priceSatang: number;
  ingredients: readonly {
    countedItemId: string;
    quantity: number;
  }[];
};

export type BillClearMovement = {
  billId: string;
  billLineId: string;
  countedItemId: string;
  quantity: number;
  reason: Extract<DeskStockMovementReason, "bill_sale">;
};

function sellableMap(
  sellables: readonly DeskSellableForBill[],
): Map<string, DeskSellableForBill> {
  return new Map(sellables.map((sellable) => [sellable.id, sellable]));
}

export function billTotalSatang(
  lines: readonly DeskBillLine[],
  sellables: readonly DeskSellableForBill[],
): number {
  const byId = sellableMap(sellables);

  return lines.reduce((total, line) => {
    const sellable = byId.get(line.sellableItemId);
    if (!sellable) {
      throw new Error(`Unknown sellable item: ${line.sellableItemId}`);
    }
    return total + sellable.priceSatang * line.quantity;
  }, 0);
}

export function planBillClear(
  bill: {
    id: string;
    status: DeskBillStatus;
    lines: readonly (DeskBillLine & { id: string })[];
  },
  sellables: readonly DeskSellableForBill[],
): BillClearMovement[] {
  if (bill.status === "cleared") {
    return [];
  }

  const byId = sellableMap(sellables);
  const movements: BillClearMovement[] = [];

  for (const line of bill.lines) {
    const sellable = byId.get(line.sellableItemId);
    if (!sellable) {
      throw new Error(`Unknown sellable item: ${line.sellableItemId}`);
    }

    const quantitiesByCountedItem = new Map<string, number>();
    for (const ingredient of sellable.ingredients) {
      quantitiesByCountedItem.set(
        ingredient.countedItemId,
        (quantitiesByCountedItem.get(ingredient.countedItemId) ?? 0) +
          ingredient.quantity * line.quantity,
      );
    }

    for (const [countedItemId, quantity] of quantitiesByCountedItem) {
      movements.push({
        billId: bill.id,
        billLineId: line.id,
        countedItemId,
        quantity: -quantity,
        reason: "bill_sale",
      });
    }
  }

  return movements;
}

/** Sellable ids on the bill that will not post stock when cleared (empty recipe). */
export function billLineSellableIdsWithoutStockCut(
  lines: readonly DeskBillLine[],
  sellables: readonly DeskSellableForBill[],
): string[] {
  const byId = sellableMap(sellables);
  const missing: string[] = [];
  for (const line of lines) {
    const sellable = byId.get(line.sellableItemId);
    if (!sellable) continue;
    if (sellable.ingredients.length === 0 && !missing.includes(sellable.id)) {
      missing.push(sellable.id);
    }
  }
  return missing;
}
