"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { planBillClear } from "@/lib/desk-bills";
import {
  addDeskBillLine,
  createDeskBill,
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
import { requireStaffSession } from "@/lib/staff-auth";

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
}

export async function createLaundryRecord(formData: FormData) {
  await requireStaffSession();
  const category = value(formData, "category") as DeskLaundryCategory;
  const status = value(formData, "status") as DeskLaundryStatus;
  if (!DESK_LAUNDRY_CATEGORIES.includes(category)) {
    throw new Error("Choose a laundry category.");
  }
  if (!DESK_LAUNDRY_STATUSES.includes(status)) {
    throw new Error("Choose a laundry status.");
  }
  const measureType = value(formData, "measure-type");
  const kg = Number(value(formData, "kg"));
  const count = positiveInteger(formData, "count");
  const grams =
    measureType === "kg" && Number.isFinite(kg) && kg > 0
      ? Math.round(kg * 1000)
      : null;
  const input = {
    name: value(formData, "name"),
    category,
    grams,
    count: measureType === "count" ? count || null : null,
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
  redirect("/staff/laundry");
}

export async function updateLaundryRecord(formData: FormData) {
  await requireStaffSession();
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
  redirect(`/staff/laundry?open=${encodeURIComponent(id)}`);
}

export async function createBill(formData: FormData) {
  await requireStaffSession();
  const id = await createDeskBill({
    name: required(formData, "name", "Bill name"),
    room: value(formData, "room") || null,
  });
  const sellableItemId = value(formData, "sellable-item-id");
  if (sellableItemId) {
    await addDeskBillLine({
      billId: id,
      sellableItemId,
      quantity: positiveInteger(formData, "quantity", 1),
    });
  }
  revalidateDesk();
  redirect(`/staff/bills?id=${encodeURIComponent(id)}`);
}

export async function addBillLine(formData: FormData) {
  await requireStaffSession();
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  await addDeskBillLine({
    billId,
    sellableItemId: required(formData, "sellable-item-id", "Item"),
    quantity: positiveInteger(formData, "quantity", 1),
  });
  revalidateDesk();
  redirect(`/staff/bills?id=${encodeURIComponent(billId)}`);
}

export async function removeBillLine(formData: FormData) {
  await requireStaffSession();
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  await removeDeskBillLine(required(formData, "line-id", "Bill line"));
  revalidateDesk();
  redirect(`/staff/bills?id=${encodeURIComponent(billId)}`);
}

export async function clearBill(formData: FormData) {
  await requireStaffSession();
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status === "cleared") {
    revalidateDesk();
    redirect(`/staff/bills?id=${encodeURIComponent(billId)}`);
  }
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
  redirect(`/staff/bills?id=${encodeURIComponent(bill.id)}`);
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
  redirect(`/staff/items?edit=${encodeURIComponent(id)}`);
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
  redirect(`/staff/stock?edit=${encodeURIComponent(id)}`);
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
