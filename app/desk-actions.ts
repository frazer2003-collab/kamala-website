"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { planBillClear } from "@/lib/desk-bills";
import {
  addDeskBillLine,
  createDeskBill,
  createDeskExpense,
  deleteDeskCountedItem,
  deleteDeskExpense,
  deleteDeskLaundry,
  deleteDeskTourSale,
  deleteDeskSellable,
  markDeskLaundryReceived,
  saveDeskTourSale,
  updateDeskTourSale,
  ensureSellableForCountedItem,
  listDeskCountedItems,
  listDeskItemCategories,
  listDeskSellables,
  loadDeskBill,
  markDeskBillCleared,
  recordDeskStockMovement,
  removeDeskBillLine,
  saveDeskCountedItem,
  saveDeskItemCategory,
  saveDeskLaundry,
  saveDeskSellable,
  updateDeskBill,
  updateDeskBillLinePrice,
} from "@/lib/desk-ops-data";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  normalizeDeskUnit,
  slugifyCategoryKey,
} from "@/lib/desk-items";
import {
  DESK_LAUNDRY_CATEGORIES,
  DESK_LAUNDRY_STATUSES,
  DESK_SHEET_ITEMS,
  isDeskSheetItemKey,
  sumLaundryLineQuantity,
  validateLaundryRecord,
  type DeskLaundryCategory,
  type DeskLaundryLine,
  type DeskLaundryStatus,
} from "@/lib/desk-laundry";
import { parseBahtToSatang } from "@/lib/desk-money";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { getStaffSession, requireStaffSession } from "@/lib/staff-auth";
import { staffT } from "@/lib/staff-i18n";
import { getStaffLocale } from "@/lib/staff-locale-server";

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
  revalidatePath("/staff/expenses");
  revalidatePath("/staff/trips");
  revalidatePath("/staff/sold");
  revalidatePath("/staff/portal/bills");
  revalidatePath("/staff/portal/laundry");
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isQuiet(formData: FormData) {
  return value(formData, "quiet") === "1";
}

type DeskQuietOk = { ok: true; id?: string };

/** DeskQuietForm sets quiet=1 — return instead of redirect so the UI stays snappy. */
function finishDeskMutation(
  formData: FormData,
  redirectTo: string,
  result: DeskQuietOk = { ok: true },
): DeskQuietOk {
  if (isQuiet(formData)) return result;
  redirect(redirectTo);
}

function safeDeskReturnTo(formData: FormData, fallback: string) {
  const next = value(formData, "return-to");
  const allowed = [
    "/staff/bills",
    "/staff/laundry",
    "/staff/portal/bills",
    "/staff/portal/laundry",
  ];
  if (
    allowed.some((path) => next === path || next.startsWith(`${path}?`))
  ) {
    return next;
  }
  return fallback;
}

function billsReturnWithOpen(formData: FormData, billId: string) {
  const base = safeDeskReturnTo(formData, "/staff/bills");
  const url = new URL(base, "https://kamala.local");
  url.searchParams.set("open", billId);
  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

async function requireDeskWriteAccess(kind: "bills" | "laundry" | "stock" | "items") {
  if (await getStaffSession()) return;
  if (kind === "bills" || kind === "laundry") {
    const portal = await getDeskPortalSession();
    if (portal?.kind === kind) return;
  }
  await requireStaffSession();
}

/** Audit label for desk writes: staff subject, else portal kind, else staff. */
async function resolveDeskActorLabel() {
  const session = await getStaffSession();
  if (session?.subject) return session.subject;
  const portal = await getDeskPortalSession();
  if (portal?.kind === "bills") return "portal:bills";
  if (portal?.kind === "laundry") return "portal:laundry";
  return "staff";
}

function readLaundrySheetLines(formData: FormData): DeskLaundryLine[] {
  const lines: DeskLaundryLine[] = [];
  for (const item of DESK_SHEET_ITEMS) {
    const quantity = positiveInteger(formData, `sheet-${item.key}`);
    if (quantity > 0) lines.push({ key: item.key, quantity });
  }
  // Also accept free-form sheet-key / sheet-qty pairs if added later.
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("sheet-") || key === "sheet-") continue;
    const itemKey = key.slice("sheet-".length);
    if (!isDeskSheetItemKey(itemKey)) continue;
    if (lines.some((line) => line.key === itemKey)) continue;
    const quantity = Number(String(raw).trim());
    if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;
    lines.push({ key: itemKey, quantity });
  }
  return lines;
}

export async function createLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  const portal = await getDeskPortalSession();
  const categoryRaw = value(formData, "category") as DeskLaundryCategory;
  const category =
    portal?.kind === "laundry" ? ("sheets" as const) : categoryRaw;
  const statusRaw = value(formData, "status") as DeskLaundryStatus;
  const status = DESK_LAUNDRY_STATUSES.includes(statusRaw)
    ? statusRaw
    : "unpaid";
  if (!DESK_LAUNDRY_CATEGORIES.includes(category)) {
    throw new Error("Choose a laundry category.");
  }
  const priceSatang = parseBahtToSatang(value(formData, "price-baht"));
  if (priceSatang === null) throw new Error("Enter a laundry price.");

  let grams: number | null = null;
  let count: number | null = null;
  let lines: DeskLaundryLine[] = [];

  if (category === "sheets") {
    lines = readLaundrySheetLines(formData);
    count = sumLaundryLineQuantity(lines) || null;
  } else {
    const measureType = value(formData, "type") || value(formData, "measure-type");
    const measureRaw = value(formData, "measure");
    if (measureType === "count") {
      count =
        positiveInteger(formData, "measure") ||
        positiveInteger(formData, "count") ||
        null;
    } else {
      const kg = Number(measureRaw || value(formData, "kg"));
      grams = Number.isFinite(kg) && kg > 0 ? Math.round(kg * 1000) : null;
    }
  }

  const input = {
    name: value(formData, "name"),
    category,
    grams,
    count,
    lines,
    email: null,
  };
  const errors = validateLaundryRecord(input);
  if (errors.length) throw new Error(errors.join(" "));
  const id = await saveDeskLaundry({
    ...input,
    staffNote: value(formData, "staff-note") || null,
    status,
    priceSatang,
  });
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/laundry"),
    { ok: true, id },
  );
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
  const priceSatang = parseBahtToSatang(value(formData, "price-baht"));
  if (priceSatang === null) throw new Error("Enter a laundry price.");
  const grams = nonNegativeInteger(formData, "grams") || null;
  const count = nonNegativeInteger(formData, "count") || null;
  const lines =
    category === "sheets" ? readLaundrySheetLines(formData) : [];
  const input = {
    name: value(formData, "name"),
    category,
    grams: lines.length ? null : grams,
    count: lines.length ? sumLaundryLineQuantity(lines) || null : count,
    lines,
    email: null,
  };
  const errors = validateLaundryRecord(input);
  if (errors.length) throw new Error(errors.join(" "));
  await saveDeskLaundry({
    id,
    ...input,
    staffNote: value(formData, "staff-note") || null,
    status,
    priceSatang,
  });
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/laundry"),
    { ok: true, id },
  );
}

export async function receiveLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  await markDeskLaundryReceived(required(formData, "id", "Laundry record"));
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/laundry"),
    { ok: true },
  );
}

export async function deleteLaundryRecord(formData: FormData) {
  await requireDeskWriteAccess("laundry");
  await deleteDeskLaundry(required(formData, "id", "Laundry record"));
  revalidateDesk();
  return finishDeskMutation(formData, safeDeskReturnTo(formData, "/staff/laundry"));
}

export async function createTourSale(formData: FormData) {
  await requireStaffSession();
  const amountSatang = parseBahtToSatang(value(formData, "amount-baht"));
  if (amountSatang === null) throw new Error("Enter a valid sale amount.");
  const guests = positiveInteger(formData, "guests", 1);
  const saleDate = value(formData, "sale-date") || getPropertyTodayIso();
  const tripDate = value(formData, "trip-date") || saleDate;
  if (!isIsoDate(saleDate)) throw new Error("Choose a sale date.");
  if (!isIsoDate(tripDate)) throw new Error("Choose a trip date.");
  const paymentRaw = value(formData, "payment-status");
  const paymentStatus =
    paymentRaw === "stripe" ||
    paymentRaw === "qr" ||
    paymentRaw === "cash" ||
    paymentRaw === "unpaid"
      ? paymentRaw
      : "unpaid";
  const session = await getStaffSession();
  const name = required(formData, "name", "Trip or tour name");
  const guestName = value(formData, "guest-name") || null;
  const id = await saveDeskTourSale({
    name,
    amountSatang,
    guests,
    staffNote: value(formData, "staff-note") || null,
    saleDate,
    tripDate,
    paymentStatus,
    guestName,
    guestPhone: value(formData, "guest-phone") || null,
    guestEmail: value(formData, "guest-email") || null,
    actedBy: session?.subject ?? null,
  });
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/trips"),
    { ok: true, id },
  );
}

export async function updateTourSalePayment(formData: FormData) {
  await requireStaffSession();
  const id = required(formData, "id", "Tour sale");
  const paymentRaw = value(formData, "payment-status");
  if (
    paymentRaw !== "unpaid" &&
    paymentRaw !== "stripe" &&
    paymentRaw !== "qr" &&
    paymentRaw !== "cash"
  ) {
    throw new Error("Choose a payment status.");
  }
  await updateDeskTourSale({ id, paymentStatus: paymentRaw });
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/trips"),
  );
}

export async function deleteTourSale(formData: FormData) {
  await requireStaffSession();
  await deleteDeskTourSale(required(formData, "id", "Tour sale"));
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/trips"),
  );
}

export async function deactivateSellableItem(formData: FormData) {
  await requireStaffSession();
  await deleteDeskSellable(required(formData, "id", "Item"));
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items");
}

export async function deactivateCountedItem(formData: FormData) {
  await requireStaffSession();
  await deleteDeskCountedItem(required(formData, "id", "Stock item"));
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items");
}

export async function createBill(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const locale = await getStaffLocale();
  const id = await createDeskBill({
    name: value(formData, "name") || staffT(locale, "bills.new"),
    room: value(formData, "room") || null,
  });
  revalidateDesk();
  return finishDeskMutation(formData, billsReturnWithOpen(formData, id), {
    ok: true,
    id,
  });
}

export async function updateBill(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  await updateDeskBill({
    id: billId,
    name: required(formData, "name", "Bill name"),
    room: value(formData, "room") || null,
  });
  revalidateDesk();
  return finishDeskMutation(formData, billsReturnWithOpen(formData, billId), {
    ok: true,
    id: billId,
  });
}

async function resolveBillSellableId(formData: FormData, raw: string) {
  if (raw.startsWith("stock:")) {
    const priceRaw = value(formData, "stock-price-baht");
    const priceSatang = priceRaw ? parseBahtToSatang(priceRaw) : null;
    return ensureSellableForCountedItem(
      raw.slice("stock:".length),
      priceSatang === null ? undefined : priceSatang,
    );
  }
  return raw;
}

export async function addBillLine(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  const sellableItemId = await resolveBillSellableId(
    formData,
    required(formData, "sellable-item-id", "Item"),
  );
  const sellables = await listDeskSellables();
  const sellable = sellables.find((item) => item.id === sellableItemId);
  if (!sellable) throw new Error("Unknown item.");
  const overrideRaw = value(formData, "unit-price-baht");
  const overrideSatang = overrideRaw ? parseBahtToSatang(overrideRaw) : null;
  const unitPriceSatang =
    overrideSatang != null ? overrideSatang : sellable.priceSatang;
  await addDeskBillLine({
    billId,
    sellableItemId,
    quantity: positiveInteger(formData, "quantity", 1),
    unitPriceSatang,
  });
  revalidateDesk();
  return finishDeskMutation(formData, billsReturnWithOpen(formData, billId), {
    ok: true,
    id: billId,
  });
}

export async function updateBillLinePrice(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  const lineId = required(formData, "line-id", "Bill line");
  if (!bill.lines.some((line) => line.id === lineId)) {
    throw new Error("Line is not on this bill.");
  }
  const unitPriceSatang = parseBahtToSatang(value(formData, "unit-price-baht"));
  if (unitPriceSatang === null) throw new Error("Enter a valid baht price.");
  await updateDeskBillLinePrice({ id: lineId, unitPriceSatang });
  revalidateDesk();
  return finishDeskMutation(formData, billsReturnWithOpen(formData, billId), {
    ok: true,
    id: billId,
  });
}

export async function removeBillLine(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status !== "open") throw new Error("This bill is not open.");
  await removeDeskBillLine(required(formData, "line-id", "Bill line"));
  revalidateDesk();
  return finishDeskMutation(formData, billsReturnWithOpen(formData, billId), {
    ok: true,
    id: billId,
  });
}

export async function clearBill(formData: FormData) {
  await requireDeskWriteAccess("bills");
  const billId = required(formData, "bill-id", "Bill");
  const bill = await loadDeskBill(billId);
  if (!bill || bill.status === "cleared") {
    revalidateDesk();
    return finishDeskMutation(
      formData,
      safeDeskReturnTo(formData, "/staff/bills"),
      { ok: true, id: billId },
    );
  }
  if (bill.lines.length === 0) {
    throw new Error("Cannot clear a bill with no lines.");
  }
  const actedBy = await resolveDeskActorLabel();
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
      actedBy,
    });
  }
  await markDeskBillCleared(bill.id, actedBy);
  revalidateDesk();
  return finishDeskMutation(
    formData,
    safeDeskReturnTo(formData, "/staff/bills"),
    { ok: true, id: billId },
  );
}

export async function saveSellableItem(formData: FormData) {
  await requireStaffSession();
  const category = value(formData, "category");
  if (category === "laundry") {
    throw new Error("Guest laundry is tracked on Laundry / Expenses, not Menu.");
  }
  const categories = await listDeskItemCategories();
  if (!categories.some((entry) => entry.active && entry.key === category)) {
    throw new Error("Choose an item category.");
  }
  const priceSatang = parseBahtToSatang(value(formData, "price-baht"));
  if (priceSatang === null) throw new Error("Enter a valid sell price.");
  const costRaw = value(formData, "cost-baht");
  const costSatang = costRaw ? parseBahtToSatang(costRaw) : 0;
  if (costSatang === null) throw new Error("Enter a valid cost price.");
  const countedItems = await listDeskCountedItems();
  const ingredients = countedItems.flatMap((item) => {
    const quantity = positiveInteger(formData, `ingredient-${item.id}`);
    return quantity ? [{ countedItemId: item.id, quantity }] : [];
  });
  const id = await saveDeskSellable({
    id: value(formData, "id") || undefined,
    nameTh: required(formData, "name-th", "Thai name"),
    nameEn: required(formData, "name-en", "English name"),
    category,
    priceSatang,
    costSatang,
    minimum: nonNegativeInteger(formData, "minimum"),
    active: formData.get("active") === "on",
    ingredients,
    attachedLaundryIds: [],
  });
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items", { ok: true, id });
}

export async function saveItemCategory(formData: FormData) {
  await requireStaffSession();
  const nameEn = required(formData, "name-en", "English name");
  const nameTh = value(formData, "name-th") || nameEn;
  const existingId = value(formData, "id") || undefined;
  const key = existingId
    ? required(formData, "key", "Category key")
    : slugifyCategoryKey(value(formData, "key") || nameEn);
  if (!key) throw new Error("Category needs an English name or key.");
  if (key === "laundry") {
    throw new Error("Guest laundry is tracked on Laundry / Expenses, not Menu.");
  }
  const id = await saveDeskItemCategory({
    id: existingId,
    key,
    nameEn,
    nameTh,
    sortOrder: nonNegativeInteger(formData, "sort-order", 100),
    active: existingId ? formData.get("active") === "on" : true,
  });
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items", { ok: true, id });
}

export async function saveCountedItem(formData: FormData) {
  await requireStaffSession();
  const unit = normalizeDeskUnit(required(formData, "unit", "Unit"));
  if (!unit) throw new Error("Choose or type a stock unit.");
  const sellRaw = value(formData, "sell-price-baht");
  const costRaw = value(formData, "cost-baht");
  const sellPriceSatang = sellRaw ? parseBahtToSatang(sellRaw) : 0;
  const costSatang = costRaw ? parseBahtToSatang(costRaw) : 0;
  if (sellPriceSatang === null) throw new Error("Enter a valid sell price.");
  if (costSatang === null) throw new Error("Enter a valid cost price.");
  const id = await saveDeskCountedItem({
    id: value(formData, "id") || undefined,
    nameTh: required(formData, "name-th", "Thai name"),
    nameEn: required(formData, "name-en", "English name"),
    unit,
    openingQuantity: nonNegativeInteger(formData, "opening-quantity"),
    minimum: nonNegativeInteger(formData, "minimum"),
    costSatang,
    sellPriceSatang,
    active: formData.get("active") === "on",
  });
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items", { ok: true, id });
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
  const actedBy = await resolveDeskActorLabel();
  await recordDeskStockMovement({
    countedItemId: required(formData, "counted-item-id", "Stock item"),
    quantity,
    reason: reason as "purchase" | "waste" | "adjustment",
    note: value(formData, "note") || null,
    actedBy,
  });
  revalidateDesk();
  return finishDeskMutation(formData, "/staff/items");
}

export async function createExpense(formData: FormData) {
  await requireStaffSession();
  const amountSatang = parseBahtToSatang(value(formData, "amount-baht"));
  if (amountSatang === null) throw new Error("Enter a valid cost.");
  const expenseDate = value(formData, "expense-date") || getPropertyTodayIso();
  if (!isIsoDate(expenseDate)) throw new Error("Choose a valid date.");
  const actedBy = await resolveDeskActorLabel();
  const id = await createDeskExpense({
    name: required(formData, "name", "Charge name"),
    amountSatang,
    staffNote: value(formData, "staff-note") || null,
    expenseDate,
    actedBy,
  });
  const returnTo = value(formData, "return-to");
  revalidateDesk();
  return finishDeskMutation(
    formData,
    returnTo.startsWith("/staff/expenses") ? returnTo : "/staff/expenses",
    { ok: true, id },
  );
}

export async function deleteExpense(formData: FormData) {
  await requireStaffSession();
  await deleteDeskExpense(required(formData, "id", "Expense"));
  const returnTo = value(formData, "return-to");
  revalidateDesk();
  return finishDeskMutation(
    formData,
    returnTo.startsWith("/staff/expenses") ? returnTo : "/staff/expenses",
  );
}
