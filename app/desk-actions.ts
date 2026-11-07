"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { planBillClear } from "@/lib/desk-bills";
import {
  addDeskBillLine,
  createDeskBill,
  deleteDeskCountedItem,
  deleteDeskLaundry,
  deleteDeskSellable,
  ensureSellableForCountedItem,
  listDeskCountedItems,
  listDeskSellables,
  loadDeskBill,
  markDeskBillCleared,
  recordDeskStockMovement,
  removeDeskBillLine,
  saveDeskCountedItem,
  saveDeskLaundry,
  saveDeskSellable,
} from "@/lib/desk-ops-data";
import {
  DESK_COUNTED_UNITS,
  DESK_SELLABLE_CATEGORIES,
  type DeskCountedUnit,
  type DeskSellableCategory,
} from "@/lib/desk-items";
import {
  DESK_LAUNDRY_CATEGORIES,
  DESK_LAUNDRY_STATUSES,
  validateLaundryRecord,
  type DeskLaundryCategory,
  type DeskLaundryStatus,
} from "@/lib/desk-laundry";
import { parseBahtToSatang } from "@/lib/desk-money";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { getStaffSession, requireStaffSession } from "@/lib/staff-auth";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function positiveInteger(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(value(formData, key));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(formData: FormData, key: string, fallback = 0) {
  const parsed = Number(value(formData, key));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function required(formData: FormData, key: string, label: string) {
  const result = value(formData, key);
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function revalidateDesk() {
  revalidatePath("/staff/home");
  revalidatePath("/staff/bills");
  revalidatePath("/staff/stock");
  revalidatePath("/staff/laundry");
  revalidatePath("/staff/items");
  revalidatePath("/staff/portal/bills");
  revalidatePath("/staff/portal/laundry");
}

function safeDeskReturnTo(formData: FormData, fallback: string) {
  const next = value(formData, "return-to");
  if (
    next === "/staff/bills" ||
    next === "/staff/laundry" ||
    next === "/staff/portal/bills" ||
    next === "/staff/portal/laundry"
  ) {
    return next;
  }
  return fallback;
}

async function requireDeskWriteAccess(kind: "bills" | "laundry" | "stock" | "items") {
  if (await getStaffSession()) return;
  if (kind === "bills" || kind === "laundry") {
    const portal = await getDeskPortalSession();
    if (portal?.kind === kind) return;
  }
  await requireStaffSession();
}

export async function createLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  const portal = await getDeskPortalSession();
  const categoryRaw = value(formData, "category") as DeskLaundryCategory;
  const category =
    portal?.kind === "laundry" ? ("sheets" as const) : categoryRaw;
  const status = value(formData, "status") as DeskLaundryStatus;
  if (!DESK_LAUNDRY_CATEGORIES.includes(category)) {
    throw new Error("Choose a laundry category.");
  }
  if (!DESK_LAUNDRY_STATUSES.includes(status)) {
    throw new Error("Choose a laundry status.");
  }
  const measureType = value(formData, "type") || value(formData, "measure-type");
  const measureRaw = value(formData, "measure");
  let grams: number | null = null;
  let count: number | null = null;
  if (measureType === "count") {
    count =
      positiveInteger(formData, "measure") ||
      positiveInteger(formData, "count") ||
      null;
  } else {
    const kg = Number(measureRaw || value(formData, "kg"));
    grams = Number.isFinite(kg) && kg > 0 ? Math.round(kg * 1000) : null;
  }
  const input = {
    name: value(formData, "name"),
    category,
    grams,
    count,
    email: null,
  };
  const errors = validateLaundryRecord(input);
  if (errors.length) throw new Error(errors.join(" "));
  await saveDeskLaundry({
    ...input,
    staffNote: value(formData, "staff-note") || null,
    status,
  });
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/laundry"));
}

export async function updateLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  const id = required(formData, "id", "Laundry record");
  const category = value(formData, "category") as DeskLaundryCategory;
  const status = value(formData, "status") as DeskLaundryStatus;
  if (!DESK_LAUNDRY_CATEGORIES.includes(category)) {
    throw new Error("Choose a laundry category.");
  }
  if (!DESK_LAUNDRY_STATUSES.includes(status)) {
    throw new Error("Choose a laundry status.");
  }
  const grams = nonNegativeInteger(formData, "grams") || null;
  const count = nonNegativeInteger(formData, "count") || null;
  const input = {
    name: value(formData, "name"),
    category,
    grams,
    count,
    email: null,
  };
  const errors = validateLaundryRecord(input);
  if (errors.length) throw new Error(errors.join(" "));
  await saveDeskLaundry({
    id,
    ...input,
    staffNote: value(formData, "staff-note") || null,
    status,
  });
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/laundry"));
}

export async function deleteLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  await deleteDeskLaundry(required(formData, "id", "Laundry record"));
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/laundry"));
}

export async function deactivateSellableItem(formData: FormData) {
  await requireStaffSession();
  await deleteDeskSellable(required(formData, "id", "Item"));
  revalidateDesk();
  redirect("/staff/items");
}

export async function deactivateCountedItem(formData: FormData) {
  await requireStaffSession();
  await deleteDeskCountedItem(required(formData, "id", "Stock item"));
  revalidateDesk();
  redirect("/staff/stock");
}

export async function createBill(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const id = await createDeskBill({
    name: required(formData, "name", "Bill name"),
    room: value(formData, "room") || null,
  });
  const rawSellable = value(formData, "sellable-item-id");
  if (rawSellable) {
    await addDeskBillLine({
      billId: id,
      sellableItemId: await resolveBillSellableId(rawSellable),
      quantity: positiveInteger(formData, "quantity", 1),
    });
  }
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/bills"));
}

async function resolveBillSellableId(raw: string) {
  if (raw.startsWith("stock:")) {
    return ensureSellableForCountedItem(raw.slice("stock:".length));
  }
  return raw;
}

export async function addBillLine(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  const sellableItemId = await resolveBillSellableId(
    required(formData, "sellable-item-id", "Item"),
  );
  await addDeskBillLine({
    billId,
    sellableItemId,
    quantity: positiveInteger(formData, "quantity", 1),
  });
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/bills"));
}

export async function removeBillLine(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  await removeDeskBillLine(required(formData, "line-id", "Bill line"));
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/bills"));
}

export async function clearBill(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status === "cleared") {
    revalidateDesk();
    redirect(safeDeskReturnTo(formData, "/staff/bills"));
  }
  // Reload sellables with recipes so stock movements match current catalog.
  const sellables = await listDeskSellables();
  const movements = planBillClear(
    {
      id: bill.id,
      status: bill.status,
      lines: bill.lines,
    },
    sellables,
  );
  for (const movement of movements) {
    await recordDeskStockMovement({
      countedItemId: movement.countedItemId,
      quantity: movement.quantity,
      reason: movement.reason,
      sourceBillLineId: movement.billLineId,
      note: `Bill ${bill.name}`,
    });
  }
  await markDeskBillCleared(bill.id);
  revalidateDesk();
  redirect(safeDeskReturnTo(formData, "/staff/bills"));
}

export async function saveSellableItem(formData: FormData) {
  await requireStaffSession();
  const category = value(formData, "category") as DeskSellableCategory;
  if (!DESK_SELLABLE_CATEGORIES.includes(category)) {
    throw new Error("Choose an item category.");
  }
  const priceSatang = parseBahtToSatang(value(formData, "price-baht"));
  if (priceSatang === null) throw new Error("Enter a valid baht price.");
  const countedItems = await listDeskCountedItems();
  const ingredients = countedItems.flatMap((item) => {
    const quantity = positiveInteger(formData, `ingredient-${item.id}`);
    return quantity ? [{ countedItemId: item.id, quantity }] : [];
  });
  const attachedLaundryIds = formData
    .getAll("attached-laundry-id")
    .map(String)
    .filter(Boolean);
  const id = await saveDeskSellable({
    id: value(formData, "id") || undefined,
    nameTh: required(formData, "name-th", "Thai name"),
    nameEn: required(formData, "name-en", "English name"),
    category,
    priceSatang,
    minimum: nonNegativeInteger(formData, "minimum"),
    active: formData.get("active") === "on",
    ingredients,
    attachedLaundryIds,
  });
  revalidateDesk();
  redirect("/staff/items");
}

export async function saveCountedItem(formData: FormData) {
  await requireStaffSession();
  const unit = value(formData, "unit") as DeskCountedUnit;
  if (!DESK_COUNTED_UNITS.includes(unit)) throw new Error("Choose a stock unit.");
  const id = await saveDeskCountedItem({
    id: value(formData, "id") || undefined,
    nameTh: required(formData, "name-th", "Thai name"),
    nameEn: required(formData, "name-en", "English name"),
    unit,
    openingQuantity: nonNegativeInteger(formData, "opening-quantity"),
    minimum: nonNegativeInteger(formData, "minimum"),
    active: formData.get("active") === "on",
  });
  revalidateDesk();
  redirect("/staff/stock");
}

export async function recordStockMovement(formData: FormData) {
  await requireStaffSession();
  const reason = value(formData, "reason");
  if (!["purchase", "waste", "adjustment"].includes(reason)) {
    throw new Error("Choose purchase, waste, or adjustment.");
  }
  const rawQuantity = Number(value(formData, "quantity"));
  if (!Number.isSafeInteger(rawQuantity) || rawQuantity === 0) {
    throw new Error("Enter a non-zero whole quantity.");
  }
  const quantity =
    reason === "waste" ? -Math.abs(rawQuantity) : rawQuantity;
  await recordDeskStockMovement({
    countedItemId: required(formData, "counted-item-id", "Stock item"),
    quantity,
    reason: reason as "purchase" | "waste" | "adjustment",
    note: value(formData, "note") || null,
  });
  revalidateDesk();
  redirect("/staff/stock");
}
