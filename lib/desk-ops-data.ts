import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeskBillStatus } from "@/lib/desk-bills";
import type {
  DeskCountedUnit,
  DeskItemCategory,
  DeskSellableCategory,
} from "@/lib/desk-items";
import type {
  DeskLaundryCategory,
  DeskLaundryStatus,
} from "@/lib/desk-laundry";
import { DESK_PROPERTY_ID } from "@/lib/desk-property";
import type { DeskStockMovementReason } from "@/lib/desk-stock";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
} from "@/lib/supabase";

type CountedItemRow = {
  id: string;
  property_id: string;
  name_th: string;
  name_en: string;
  unit: DeskCountedUnit;
  opening_quantity: number;
  minimum: number;
  cost_satang: number;
  sell_price_satang: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ItemCategoryRow = {
  id: string;
  property_id: string;
  key: string;
  name_en: string;
  name_th: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type StockMovementRow = {
  id: string;
  property_id: string;
  counted_item_id: string;
  quantity: number;
  reason: DeskStockMovementReason;
  source_bill_line_id: string | null;
  note: string | null;
  acted_by?: string | null;
  occurred_at: string;
  created_at: string;
};

type SellableItemRow = {
  id: string;
  property_id: string;
  name_th: string;
  name_en: string;
  category: DeskSellableCategory;
  price_satang: number;
  cost_satang: number;
  minimum: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type SellableIngredientRow = {
  id: string;
  property_id: string;
  sellable_item_id: string;
  counted_item_id: string;
  quantity: number;
  created_at: string;
};

type SellableAttachedRow = {
  id: string;
  property_id: string;
  room_sellable_item_id: string;
  laundry_sellable_item_id: string;
  created_at: string;
};

type BillRow = {
  id: string;
  property_id: string;
  name: string;
  room: string | null;
  status: DeskBillStatus;
  service_date: string;
  cleared_at: string | null;
  cleared_by?: string | null;
  created_at: string;
  updated_at: string;
};

type BillLineRow = {
  id: string;
  property_id: string;
  bill_id: string;
  sellable_item_id: string;
  quantity: number;
  unit_price_satang: number;
  created_at: string;
};

type LaundryRow = {
  id: string;
  property_id: string;
  name: string;
  category: DeskLaundryCategory;
  grams: number | null;
  count: number | null;
  staff_note: string | null;
  email: string | null;
  recorded_at: string;
  status: DeskLaundryStatus;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: string;
  property_id: string;
  name: string;
  amount_satang: number;
  staff_note: string | null;
  expense_date: string;
  acted_by: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type DeskDatabase = {
  public: {
    Tables: {
      desk_counted_items: Table<CountedItemRow>;
      desk_item_categories: Table<ItemCategoryRow>;
      desk_stock_movements: Table<StockMovementRow>;
      desk_sellable_items: Table<SellableItemRow>;
      desk_sellable_ingredients: Table<SellableIngredientRow>;
      desk_sellable_attached: Table<SellableAttachedRow>;
      desk_bills: Table<BillRow>;
      desk_bill_lines: Table<BillLineRow>;
      desk_laundry_records: Table<LaundryRow>;
      desk_expenses: Table<ExpenseRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function client(): SupabaseClient<DeskDatabase> {
  return createStaffSupabaseClient() as unknown as SupabaseClient<DeskDatabase>;
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

export type DeskCountedItem = {
  id: string;
  nameTh: string;
  nameEn: string;
  unit: DeskCountedUnit;
  openingQuantity: number;
  minimum: number;
  costSatang: number;
  sellPriceSatang: number;
  active: boolean;
  onHand: number;
  createdAt: string;
  updatedAt: string;
};

export type DeskStockMovement = {
  id: string;
  countedItemId: string;
  quantity: number;
  reason: DeskStockMovementReason;
  sourceBillLineId: string | null;
  note: string | null;
  actedBy: string | null;
  occurredAt: string;
  createdAt: string;
};

export type DeskSellableItem = {
  id: string;
  nameTh: string;
  nameEn: string;
  category: DeskSellableCategory;
  priceSatang: number;
  costSatang: number;
  minimum: number;
  active: boolean;
  ingredients: { countedItemId: string; quantity: number }[];
  attachedLaundryIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type DeskBillLineData = {
  id: string;
  billId: string;
  sellableItemId: string;
  quantity: number;
  unitPriceSatang: number;
  createdAt: string;
};

export type DeskBill = {
  id: string;
  name: string;
  room: string | null;
  status: DeskBillStatus;
  serviceDate: string;
  clearedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: DeskBillLineData[];
};

export type DeskLaundryRecord = {
  id: string;
  name: string;
  category: DeskLaundryCategory;
  grams: number | null;
  count: number | null;
  staffNote: string | null;
  email: string | null;
  recordedAt: string;
  status: DeskLaundryStatus;
  createdAt: string;
  updatedAt: string;
};

export type DeskExpense = {
  id: string;
  name: string;
  amountSatang: number;
  staffNote: string | null;
  expenseDate: string;
  actedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeskClearedBillEconomics = {
  billRevenueSatang: number;
  foodDrinkCostSatang: number;
  clearedBillCount: number;
  lineCount: number;
};

function mapExpenseRow(row: ExpenseRow): DeskExpense {
  return {
    id: row.id,
    name: row.name,
    amountSatang: row.amount_satang,
    staffNote: row.staff_note,
    expenseDate: row.expense_date,
    actedBy: row.acted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCountedItemRows(
  rows: CountedItemRow[],
  movements: Pick<StockMovementRow, "counted_item_id" | "quantity">[],
): DeskCountedItem[] {
  const movementTotals = new Map<string, number>();
  for (const movement of movements) {
    movementTotals.set(
      movement.counted_item_id,
      (movementTotals.get(movement.counted_item_id) ?? 0) + movement.quantity,
    );
  }
  return rows.map((row) => ({
    id: row.id,
    nameTh: row.name_th,
    nameEn: row.name_en,
    unit: row.unit,
    openingQuantity: row.opening_quantity,
    minimum: row.minimum,
    costSatang: row.cost_satang ?? 0,
    sellPriceSatang: row.sell_price_satang ?? 0,
    active: row.active,
    onHand: row.opening_quantity + (movementTotals.get(row.id) ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function mapSellableRows(
  rows: SellableItemRow[],
  ingredients: Pick<
    SellableIngredientRow,
    "sellable_item_id" | "counted_item_id" | "quantity"
  >[],
  attached: Pick<
    SellableAttachedRow,
    "room_sellable_item_id" | "laundry_sellable_item_id"
  >[],
): DeskSellableItem[] {
  return rows.map((row) => ({
    id: row.id,
    nameTh: row.name_th,
    nameEn: row.name_en,
    category: row.category,
    priceSatang: row.price_satang,
    costSatang: row.cost_satang ?? 0,
    minimum: row.minimum,
    active: row.active,
    ingredients: ingredients
      .filter((ingredient) => ingredient.sellable_item_id === row.id)
      .map((ingredient) => ({
        countedItemId: ingredient.counted_item_id,
        quantity: ingredient.quantity,
      })),
    attachedLaundryIds: attached
      .filter((entry) => entry.room_sellable_item_id === row.id)
      .map((entry) => entry.laundry_sellable_item_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function mapBillLine(row: BillLineRow): DeskBillLineData {
  return {
    id: row.id,
    billId: row.bill_id,
    sellableItemId: row.sellable_item_id,
    quantity: row.quantity,
    unitPriceSatang: row.unit_price_satang ?? 0,
    createdAt: row.created_at,
  };
}

function mapItemCategory(row: ItemCategoryRow): DeskItemCategory {
  return {
    id: row.id,
    key: row.key,
    nameEn: row.name_en,
    nameTh: row.name_th,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

function mapBill(row: BillRow, lines: BillLineRow[]): DeskBill {
  return {
    id: row.id,
    name: row.name,
    room: row.room,
    status: row.status,
    serviceDate: row.service_date,
    clearedAt: row.cleared_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lines: lines.filter((line) => line.bill_id === row.id).map(mapBillLine),
  };
}

export function mapLaundryRow(row: LaundryRow): DeskLaundryRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    grams: row.grams,
    count: row.count,
    staffNote: row.staff_note,
    email: row.email,
    recordedAt: row.recorded_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDeskCountedItems(): Promise<DeskCountedItem[]> {
  if (!hasStaffSupabaseConfig()) return [];
  const [itemsResult, movementsResult] = await Promise.all([
    client()
      .from("desk_counted_items")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .order("name_en"),
    client()
      .from("desk_stock_movements")
      .select("counted_item_id,quantity")
      .eq("property_id", DESK_PROPERTY_ID),
  ]);
  throwIfError(itemsResult.error);
  throwIfError(movementsResult.error);
  return mapCountedItemRows(
    itemsResult.data ?? [],
    movementsResult.data ?? [],
  );
}

export async function listDeskStockMovements(
  countedItemId?: string,
): Promise<DeskStockMovement[]> {
  if (!hasStaffSupabaseConfig()) return [];
  let query = client()
    .from("desk_stock_movements")
    .select("*")
    .eq("property_id", DESK_PROPERTY_ID)
    .order("occurred_at", { ascending: false });
  if (countedItemId) query = query.eq("counted_item_id", countedItemId);
  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    countedItemId: row.counted_item_id,
    quantity: row.quantity,
    reason: row.reason,
    sourceBillLineId: row.source_bill_line_id,
    note: row.note,
    actedBy: row.acted_by ?? null,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}

export async function listDeskItemCategories(): Promise<DeskItemCategory[]> {
  if (!hasStaffSupabaseConfig()) {
    return [
      { id: "room", key: "room", nameEn: "Room", nameTh: "ห้อง", sortOrder: 10, active: true },
      { id: "drink", key: "drink", nameEn: "Drink", nameTh: "เครื่องดื่ม", sortOrder: 20, active: true },
      { id: "food", key: "food", nameEn: "Food", nameTh: "อาหาร", sortOrder: 30, active: true },
      { id: "laundry", key: "laundry", nameEn: "Laundry", nameTh: "ซักรีด", sortOrder: 40, active: true },
      { id: "extra", key: "extra", nameEn: "Extra", nameTh: "อื่นๆ", sortOrder: 50, active: true },
    ];
  }
  const { data, error } = await client()
    .from("desk_item_categories")
    .select("*")
    .eq("property_id", DESK_PROPERTY_ID)
    .order("sort_order")
    .order("name_en");
  throwIfError(error);
  return (data ?? []).map(mapItemCategory);
}

export async function saveDeskItemCategory(input: {
  id?: string;
  key: string;
  nameEn: string;
  nameTh: string;
  sortOrder?: number;
  active: boolean;
}): Promise<string> {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    key: input.key,
    name_en: input.nameEn,
    name_th: input.nameTh,
    sort_order: input.sortOrder ?? 100,
    active: input.active,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await client()
      .from("desk_item_categories")
      .update({
        name_en: payload.name_en,
        name_th: payload.name_th,
        sort_order: payload.sort_order,
        active: payload.active,
        updated_at: payload.updated_at,
      })
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("id", input.id);
    throwIfError(error);
    return input.id;
  }
  const { data, error } = await client()
    .from("desk_item_categories")
    .insert(payload)
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Category was not created.");
  return data.id;
}

export async function saveDeskCountedItem(input: {
  id?: string;
  nameTh: string;
  nameEn: string;
  unit: DeskCountedUnit;
  openingQuantity: number;
  minimum: number;
  costSatang: number;
  sellPriceSatang: number;
  active: boolean;
}): Promise<string> {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    name_th: input.nameTh,
    name_en: input.nameEn,
    unit: input.unit,
    opening_quantity: input.openingQuantity,
    minimum: input.minimum,
    cost_satang: input.costSatang,
    sell_price_satang: input.sellPriceSatang,
    active: input.active,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await client()
      .from("desk_counted_items")
      .update(payload)
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("id", input.id);
    throwIfError(error);
    return input.id;
  }
  const { data, error } = await client()
    .from("desk_counted_items")
    .insert(payload)
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Counted item was not created.");
  return data.id;
}

export async function recordDeskStockMovement(input: {
  countedItemId: string;
  quantity: number;
  reason: Extract<
    DeskStockMovementReason,
    "purchase" | "waste" | "adjustment" | "bill_sale"
  >;
  note?: string | null;
  sourceBillLineId?: string | null;
  actedBy?: string | null;
}) {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    counted_item_id: input.countedItemId,
    quantity: input.quantity,
    reason: input.reason,
    note: input.note || null,
    source_bill_line_id: input.sourceBillLineId || null,
    acted_by: input.actedBy || null,
  };
  const { error } = await client().from("desk_stock_movements").insert(payload);
  if (input.sourceBillLineId && error?.code === "23505") {
    return;
  }
  throwIfError(error);
}

export async function listDeskSellables(): Promise<DeskSellableItem[]> {
  if (!hasStaffSupabaseConfig()) return [];
  const [itemsResult, ingredientsResult, attachedResult] = await Promise.all([
    client()
      .from("desk_sellable_items")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .order("name_en"),
    client()
      .from("desk_sellable_ingredients")
      .select("sellable_item_id,counted_item_id,quantity")
      .eq("property_id", DESK_PROPERTY_ID),
    client()
      .from("desk_sellable_attached")
      .select("room_sellable_item_id,laundry_sellable_item_id")
      .eq("property_id", DESK_PROPERTY_ID),
  ]);
  throwIfError(itemsResult.error);
  throwIfError(ingredientsResult.error);
  throwIfError(attachedResult.error);
  return mapSellableRows(
    itemsResult.data ?? [],
    ingredientsResult.data ?? [],
    attachedResult.data ?? [],
  );
}

/** Create or reuse a 1:1 sellable so counted stock can be sold on bills. */
export async function ensureSellableForCountedItem(
  countedItemId: string,
  priceSatang?: number,
): Promise<string> {
  const [countedItems, sellables] = await Promise.all([
    listDeskCountedItems(),
    listDeskSellables(),
  ]);
  const counted = countedItems.find((item) => item.id === countedItemId);
  if (!counted || !counted.active) {
    throw new Error("Unknown stock item.");
  }
  const existing = sellables.find(
    (item) =>
      item.active &&
      item.nameEn === counted.nameEn &&
      item.ingredients.length === 1 &&
      item.ingredients[0]?.countedItemId === counted.id &&
      item.ingredients[0]?.quantity === 1,
  );
  if (existing) {
    if (
      priceSatang != null &&
      Number.isSafeInteger(priceSatang) &&
      priceSatang >= 0 &&
      priceSatang !== existing.priceSatang
    ) {
      await saveDeskSellable({
        ...existing,
        priceSatang,
        costSatang: counted.costSatang,
      });
    }
    return existing.id;
  }
  const resolvedPrice =
    priceSatang != null && Number.isSafeInteger(priceSatang) && priceSatang >= 0
      ? priceSatang
      : counted.sellPriceSatang;
  if (!Number.isSafeInteger(resolvedPrice) || resolvedPrice < 0) {
    throw new Error("Enter a baht price for this stock item.");
  }
  return saveDeskSellable({
    nameTh: counted.nameTh,
    nameEn: counted.nameEn,
    category: "extra",
    priceSatang: resolvedPrice,
    costSatang: counted.costSatang,
    minimum: 0,
    active: true,
    ingredients: [{ countedItemId: counted.id, quantity: 1 }],
    attachedLaundryIds: [],
  });
}

export async function saveDeskSellable(input: {
  id?: string;
  nameTh: string;
  nameEn: string;
  category: DeskSellableCategory;
  priceSatang: number;
  costSatang: number;
  minimum: number;
  active: boolean;
  ingredients: { countedItemId: string; quantity: number }[];
  attachedLaundryIds: string[];
}): Promise<string> {
  const db = client();
  const payload = {
    property_id: DESK_PROPERTY_ID,
    name_th: input.nameTh,
    name_en: input.nameEn,
    category: input.category,
    price_satang: input.priceSatang,
    cost_satang: input.costSatang,
    minimum: input.minimum,
    active: input.active,
    updated_at: new Date().toISOString(),
  };
  let id = input.id;
  if (id) {
    const { error } = await db
      .from("desk_sellable_items")
      .update(payload)
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("id", id);
    throwIfError(error);
  } else {
    const { data, error } = await db
      .from("desk_sellable_items")
      .insert(payload)
      .select("id")
      .single();
    throwIfError(error);
    if (!data) throw new Error("Sellable item was not created.");
    id = data.id;
  }

  const [ingredientsDelete, attachedDelete] = await Promise.all([
    db
      .from("desk_sellable_ingredients")
      .delete()
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("sellable_item_id", id),
    db
      .from("desk_sellable_attached")
      .delete()
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("room_sellable_item_id", id),
  ]);
  throwIfError(ingredientsDelete.error);
  throwIfError(attachedDelete.error);

  if (input.ingredients.length) {
    const { error } = await db.from("desk_sellable_ingredients").insert(
      input.ingredients.map((ingredient) => ({
        property_id: DESK_PROPERTY_ID,
        sellable_item_id: id,
        counted_item_id: ingredient.countedItemId,
        quantity: ingredient.quantity,
      })),
    );
    throwIfError(error);
  }
  if (input.category === "room" && input.attachedLaundryIds.length) {
    const { error } = await db.from("desk_sellable_attached").insert(
      input.attachedLaundryIds.map((laundryId) => ({
        property_id: DESK_PROPERTY_ID,
        room_sellable_item_id: id,
        laundry_sellable_item_id: laundryId,
      })),
    );
    throwIfError(error);
  }
  return id;
}

export async function listDeskBills(): Promise<DeskBill[]> {
  if (!hasStaffSupabaseConfig()) return [];
  const [billsResult, linesResult] = await Promise.all([
    client()
      .from("desk_bills")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .order("created_at", { ascending: false }),
    client()
      .from("desk_bill_lines")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .order("created_at"),
  ]);
  throwIfError(billsResult.error);
  throwIfError(linesResult.error);
  return (billsResult.data ?? []).map((row) =>
    mapBill(row, linesResult.data ?? []),
  );
}

export async function loadDeskBill(id: string): Promise<DeskBill | null> {
  if (!hasStaffSupabaseConfig()) return null;
  const [billResult, linesResult] = await Promise.all([
    client()
      .from("desk_bills")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("id", id)
      .maybeSingle(),
    client()
      .from("desk_bill_lines")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("bill_id", id)
      .order("created_at"),
  ]);
  throwIfError(billResult.error);
  throwIfError(linesResult.error);
  return billResult.data
    ? mapBill(billResult.data, linesResult.data ?? [])
    : null;
}

export async function createDeskBill(input: {
  name: string;
  room?: string | null;
}): Promise<string> {
  const { data, error } = await client()
    .from("desk_bills")
    .insert({
      property_id: DESK_PROPERTY_ID,
      name: input.name,
      room: input.room || null,
    })
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Bill was not created.");
  return data.id;
}

export async function updateDeskBill(input: {
  id: string;
  name: string;
  room?: string | null;
}) {
  const { error } = await client()
    .from("desk_bills")
    .update({
      name: input.name,
      room: input.room || null,
      updated_at: new Date().toISOString(),
    })
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", input.id)
    .eq("status", "open");
  throwIfError(error);
}

export async function addDeskBillLine(input: {
  billId: string;
  sellableItemId: string;
  quantity: number;
  unitPriceSatang: number;
}) {
  const { error } = await client().from("desk_bill_lines").insert({
    property_id: DESK_PROPERTY_ID,
    bill_id: input.billId,
    sellable_item_id: input.sellableItemId,
    quantity: input.quantity,
    unit_price_satang: input.unitPriceSatang,
  });
  throwIfError(error);
}

export async function updateDeskBillLinePrice(input: {
  id: string;
  unitPriceSatang: number;
}) {
  const { error } = await client()
    .from("desk_bill_lines")
    .update({ unit_price_satang: input.unitPriceSatang })
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", input.id);
  throwIfError(error);
}

export async function removeDeskBillLine(id: string) {
  const { error } = await client()
    .from("desk_bill_lines")
    .delete()
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id);
  throwIfError(error);
}

export async function markDeskBillCleared(
  id: string,
  actedBy?: string | null,
) {
  const { error } = await client()
    .from("desk_bills")
    .update({
      status: "cleared",
      cleared_at: new Date().toISOString(),
      cleared_by: actedBy || null,
      updated_at: new Date().toISOString(),
    })
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id)
    .eq("status", "open");
  throwIfError(error);
}

export async function listDeskLaundry(): Promise<DeskLaundryRecord[]> {
  if (!hasStaffSupabaseConfig()) return [];
  const { data, error } = await client()
    .from("desk_laundry_records")
    .select("*")
    .eq("property_id", DESK_PROPERTY_ID)
    .order("recorded_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map(mapLaundryRow);
}

export async function saveDeskLaundry(input: {
  id?: string;
  name: string;
  category: DeskLaundryCategory;
  grams: number | null;
  count: number | null;
  staffNote?: string | null;
  email?: string | null;
  status: DeskLaundryStatus;
}): Promise<string> {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    name: input.name,
    category: input.category,
    grams: input.grams,
    count: input.count,
    staff_note: input.staffNote || null,
    email: input.email || null,
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await client()
      .from("desk_laundry_records")
      .update(payload)
      .eq("property_id", DESK_PROPERTY_ID)
      .eq("id", input.id);
    throwIfError(error);
    return input.id;
  }
  const { data, error } = await client()
    .from("desk_laundry_records")
    .insert(payload)
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Laundry record was not created.");
  return data.id;
}

export async function deleteDeskLaundry(id: string) {
  const { error } = await client()
    .from("desk_laundry_records")
    .delete()
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id);
  throwIfError(error);
}

export async function deleteDeskSellable(id: string) {
  const { error } = await client()
    .from("desk_sellable_items")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id);
  throwIfError(error);
}

export async function deleteDeskCountedItem(id: string) {
  const { error } = await client()
    .from("desk_counted_items")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id);
  throwIfError(error);
}

const EXPENSE_LIST_LIMIT = 2000;

/** Range-scoped expense list — never loads the full history. */
export async function listDeskExpensesInRange(
  fromIso: string,
  toIso: string,
): Promise<{
  expenses: DeskExpense[];
  truncated: boolean;
  totalSatang: number;
  count: number;
}> {
  if (!hasStaffSupabaseConfig()) {
    return { expenses: [], truncated: false, totalSatang: 0, count: 0 };
  }
  const [listResult, sumResult] = await Promise.all([
    client()
      .from("desk_expenses")
      .select("*")
      .eq("property_id", DESK_PROPERTY_ID)
      .gte("expense_date", fromIso)
      .lte("expense_date", toIso)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(EXPENSE_LIST_LIMIT + 1),
    client()
      .from("desk_expenses")
      .select("amount_satang")
      .eq("property_id", DESK_PROPERTY_ID)
      .gte("expense_date", fromIso)
      .lte("expense_date", toIso),
  ]);
  throwIfError(listResult.error);
  throwIfError(sumResult.error);
  const rows = listResult.data ?? [];
  const truncated = rows.length > EXPENSE_LIST_LIMIT;
  const expenses = (truncated ? rows.slice(0, EXPENSE_LIST_LIMIT) : rows).map(
    mapExpenseRow,
  );
  const amounts = sumResult.data ?? [];
  const totalSatang = amounts.reduce(
    (total, row) => total + (row.amount_satang ?? 0),
    0,
  );
  return { expenses, truncated, totalSatang, count: amounts.length };
}

export async function createDeskExpense(input: {
  name: string;
  amountSatang: number;
  staffNote?: string | null;
  expenseDate: string;
  actedBy?: string | null;
}): Promise<string> {
  const { data, error } = await client()
    .from("desk_expenses")
    .insert({
      property_id: DESK_PROPERTY_ID,
      name: input.name,
      amount_satang: input.amountSatang,
      staff_note: input.staffNote?.trim() || null,
      expense_date: input.expenseDate,
      acted_by: input.actedBy || null,
    })
    .select("id")
    .single();
  throwIfError(error);
  if (!data) throw new Error("Expense was not created.");
  return data.id;
}

export async function deleteDeskExpense(id: string) {
  const { error } = await client()
    .from("desk_expenses")
    .delete()
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("id", id);
  throwIfError(error);
}

/**
 * Cleared-bill sales + food/drink cost for a service-date range.
 * Cost uses the sellable catalog cost at query time (snapshot not stored on lines).
 */
export async function loadDeskClearedBillEconomics(
  fromIso: string,
  toIso: string,
): Promise<DeskClearedBillEconomics> {
  if (!hasStaffSupabaseConfig()) {
    return {
      billRevenueSatang: 0,
      foodDrinkCostSatang: 0,
      clearedBillCount: 0,
      lineCount: 0,
    };
  }
  const billsResult = await client()
    .from("desk_bills")
    .select("id")
    .eq("property_id", DESK_PROPERTY_ID)
    .eq("status", "cleared")
    .gte("service_date", fromIso)
    .lte("service_date", toIso);
  throwIfError(billsResult.error);
  const billIds = (billsResult.data ?? []).map((row) => row.id);
  if (billIds.length === 0) {
    return {
      billRevenueSatang: 0,
      foodDrinkCostSatang: 0,
      clearedBillCount: 0,
      lineCount: 0,
    };
  }

  const [linesResult, sellables] = await Promise.all([
    client()
      .from("desk_bill_lines")
      .select("sellable_item_id,quantity,unit_price_satang")
      .eq("property_id", DESK_PROPERTY_ID)
      .in("bill_id", billIds),
    listDeskSellables(),
  ]);
  throwIfError(linesResult.error);
  const costBySellable = new Map(
    sellables.map((item) => [item.id, item.costSatang] as const),
  );
  let billRevenueSatang = 0;
  let foodDrinkCostSatang = 0;
  for (const line of linesResult.data ?? []) {
    billRevenueSatang += (line.unit_price_satang ?? 0) * line.quantity;
    foodDrinkCostSatang +=
      (costBySellable.get(line.sellable_item_id) ?? 0) * line.quantity;
  }
  return {
    billRevenueSatang,
    foodDrinkCostSatang,
    clearedBillCount: billIds.length,
    lineCount: (linesResult.data ?? []).length,
  };
}
