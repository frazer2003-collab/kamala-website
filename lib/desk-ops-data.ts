import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeskBillStatus } from "@/lib/desk-bills";
import type {
  DeskCountedUnit,
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
  created_at: string;
  updated_at: string;
};

type BillLineRow = {
  id: string;
  property_id: string;
  bill_id: string;
  sellable_item_id: string;
  quantity: number;
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
      desk_stock_movements: Table<StockMovementRow>;
      desk_sellable_items: Table<SellableItemRow>;
      desk_sellable_ingredients: Table<SellableIngredientRow>;
      desk_sellable_attached: Table<SellableAttachedRow>;
      desk_bills: Table<BillRow>;
      desk_bill_lines: Table<BillLineRow>;
      desk_laundry_records: Table<LaundryRow>;
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
  occurredAt: string;
  createdAt: string;
};

export type DeskSellableItem = {
  id: string;
  nameTh: string;
  nameEn: string;
  category: DeskSellableCategory;
  priceSatang: number;
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
    createdAt: row.created_at,
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
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }));
}

export async function saveDeskCountedItem(input: {
  id?: string;
  nameTh: string;
  nameEn: string;
  unit: DeskCountedUnit;
  openingQuantity: number;
  minimum: number;
  active: boolean;
}): Promise<string> {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    name_th: input.nameTh,
    name_en: input.nameEn,
    unit: input.unit,
    opening_quantity: input.openingQuantity,
    minimum: input.minimum,
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
}) {
  const payload = {
    property_id: DESK_PROPERTY_ID,
    counted_item_id: input.countedItemId,
    quantity: input.quantity,
    reason: input.reason,
    note: input.note || null,
    source_bill_line_id: input.sourceBillLineId || null,
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

export async function saveDeskSellable(input: {
  id?: string;
  nameTh: string;
  nameEn: string;
  category: DeskSellableCategory;
  priceSatang: number;
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

export async function addDeskBillLine(input: {
  billId: string;
  sellableItemId: string;
  quantity: number;
}) {
  const { error } = await client().from("desk_bill_lines").insert({
    property_id: DESK_PROPERTY_ID,
    bill_id: input.billId,
    sellable_item_id: input.sellableItemId,
    quantity: input.quantity,
  });
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

export async function markDeskBillCleared(id: string) {
  const { error } = await client()
    .from("desk_bills")
    .update({
      status: "cleared",
      cleared_at: new Date().toISOString(),
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
