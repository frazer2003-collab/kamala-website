export type DeskExpenseInput = {
  name: string;
  amountSatang: number;
  staffNote?: string | null;
  expenseDate: string;
};

export type DeskExpenseRecord = DeskExpenseInput & {
  id: string;
  actedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function sumExpenseSatang(
  expenses: readonly { amountSatang: number }[],
): number {
  return expenses.reduce((total, row) => total + row.amountSatang, 0);
}

/** ISO Monday..Sunday containing `iso` (property-local calendar day). */
export function isoWeekRangeContaining(iso: string): {
  fromIso: string;
  toIso: string;
} {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(y, m - 1, d + mondayOffset);
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
  return {
    fromIso: toIsoDate(monday),
    toIso: toIsoDate(sunday),
  };
}

export function isoMonthRangeContaining(iso: string): {
  fromIso: string;
  toIso: string;
} {
  const [y, m] = iso.split("-").map(Number);
  const fromIso = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const toIso = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { fromIso, toIso };
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DeskGrossProfitBreakdown = {
  roomRevenueSatang: number;
  billRevenueSatang: number;
  expenseSatang: number;
  foodDrinkCostSatang: number;
  grossProfitSatang: number;
};

/**
 * Gross profit = (room stay revenue + cleared bill sales)
 *              − (expense page totals + food/drink cost from cleared bill recipes).
 * Room revenue is passed in baht from Finance; convert callers pass satang here.
 */
export function computeDeskGrossProfit(input: {
  roomRevenueSatang: number;
  billRevenueSatang: number;
  expenseSatang: number;
  foodDrinkCostSatang: number;
}): DeskGrossProfitBreakdown {
  const roomRevenueSatang = Math.max(0, input.roomRevenueSatang);
  const billRevenueSatang = Math.max(0, input.billRevenueSatang);
  const expenseSatang = Math.max(0, input.expenseSatang);
  const foodDrinkCostSatang = Math.max(0, input.foodDrinkCostSatang);
  return {
    roomRevenueSatang,
    billRevenueSatang,
    expenseSatang,
    foodDrinkCostSatang,
    grossProfitSatang:
      roomRevenueSatang +
      billRevenueSatang -
      expenseSatang -
      foodDrinkCostSatang,
  };
}

export function billLineFoodDrinkCostSatang(line: {
  quantity: number;
  costSatang: number;
}): number {
  return Math.max(0, line.costSatang) * Math.max(0, line.quantity);
}
