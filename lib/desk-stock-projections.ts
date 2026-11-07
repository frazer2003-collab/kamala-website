import { headroom } from "@/lib/desk-stock";

export type StockProjectionInput = {
  id: string;
  onHand: number;
  minimum: number;
  active: boolean;
};

export type StockMovementForProjection = {
  countedItemId: string;
  quantity: number;
  reason: string;
  occurredAt: string;
};

export type DeskStockProjection = {
  countedItemId: string;
  onHand: number;
  minimum: number;
  headroom: number;
  /** Average daily bill_sale usage over the window (absolute units). */
  avgDailyUse: number;
  /** Days until empty at avg use; null if no recent sales. */
  daysLeft: number | null;
  /** Days until minimum at avg use; null if no recent sales. */
  daysToMinimum: number | null;
  tone: "ok" | "watch" | "low" | "out";
};

const DEFAULT_WINDOW_DAYS = 14;

function startOfWindowIso(windowDays: number, now = new Date()): string {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - windowDays);
  return start.toISOString();
}

export function projectStockLevels(
  items: readonly StockProjectionInput[],
  movements: readonly StockMovementForProjection[],
  options?: { windowDays?: number; now?: Date },
): DeskStockProjection[] {
  const windowDays = options?.windowDays ?? DEFAULT_WINDOW_DAYS;
  const cutoff = startOfWindowIso(windowDays, options?.now);
  const usage = new Map<string, number>();

  for (const movement of movements) {
    if (movement.reason !== "bill_sale") continue;
    if (movement.occurredAt < cutoff) continue;
    if (movement.quantity >= 0) continue;
    usage.set(
      movement.countedItemId,
      (usage.get(movement.countedItemId) ?? 0) + Math.abs(movement.quantity),
    );
  }

  const projections = items
    .filter((item) => item.active)
    .map((item) => {
      const used = usage.get(item.id) ?? 0;
      const avgDailyUse = used / windowDays;
      const space = headroom(item.onHand, item.minimum);
      const daysLeft =
        avgDailyUse > 0 ? item.onHand / avgDailyUse : null;
      const daysToMinimum =
        avgDailyUse > 0 ? space / avgDailyUse : null;

      let tone: DeskStockProjection["tone"] = "ok";
      if (item.onHand <= 0) tone = "out";
      else if (space <= 0) tone = "low";
      else if (
        (daysToMinimum != null && daysToMinimum <= 3) ||
        (daysLeft != null && daysLeft <= 5 && space <= item.minimum * 2)
      ) {
        tone = "watch";
      }

      return {
        countedItemId: item.id,
        onHand: item.onHand,
        minimum: item.minimum,
        headroom: space,
        avgDailyUse,
        daysLeft,
        daysToMinimum,
        tone,
      };
    });

  const toneRank = { out: 0, low: 1, watch: 2, ok: 3 } as const;
  return projections.sort((a, b) => {
    if (toneRank[a.tone] !== toneRank[b.tone]) {
      return toneRank[a.tone] - toneRank[b.tone];
    }
    const aDays = a.daysToMinimum ?? Number.POSITIVE_INFINITY;
    const bDays = b.daysToMinimum ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;
    return a.headroom - b.headroom;
  });
}

export function formatProjectionDays(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value < 1) return "<1 day";
  if (value < 10) return `${value.toFixed(1)} days`;
  return `${Math.round(value)} days`;
}
