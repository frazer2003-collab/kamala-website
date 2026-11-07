"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addBillLine,
  clearBill,
  createBill,
  removeBillLine,
  updateBill,
  updateBillLinePrice,
} from "@/app/desk-actions";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { StaffCombo } from "@/components/staff-combo";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import {
  billLineSellableIdsWithoutStockCut,
  billTotalSatang,
  lineAmountSatang,
} from "@/lib/desk-bills";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang, satangToBaht } from "@/lib/desk-money";
import type {
  DeskBill,
  DeskCountedItem,
  DeskSellableItem,
} from "@/lib/desk-ops-data";

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
}

const LIVE_REFRESH_MS = 4000;

export function StaffDeskBills({
  bills,
  sellables,
  countedItems = [],
  initialOpenId = null,
  returnTo = "/staff/bills",
}: {
  bills: DeskBill[];
  sellables: DeskSellableItem[];
  countedItems?: DeskCountedItem[];
  initialOpenId?: string | null;
  returnTo?: string;
}) {
  const { t, locale } = useStaffLocale();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  const [confirmClear, setConfirmClear] = useState(false);
  const [stockPick, setStockPick] = useState<{
    countedId: string;
    priceBaht: string;
  } | null>(null);
  const selected = useMemo(
    () => bills.find((bill) => bill.id === selectedId) ?? null,
    [bills, selectedId],
  );
  const sellablesById = useMemo(
    () => new Map(sellables.map((item) => [item.id, item])),
    [sellables],
  );
  const stockSellableByCountedId = useMemo(() => {
    const map = new Map<string, DeskSellableItem>();
    for (const item of sellables) {
      if (
        !item.active ||
        item.ingredients.length !== 1 ||
        item.ingredients[0]?.quantity !== 1
      ) {
        continue;
      }
      const countedId = item.ingredients[0]?.countedItemId;
      if (countedId && !map.has(countedId)) map.set(countedId, item);
    }
    return map;
  }, [sellables]);
  const itemOptions = useMemo(() => {
    const menu = sellables
      .filter((item) => item.active)
      .map((item) => ({
        value: item.id,
        label: `${bilingualItemLabel(item)} · ${formatSatang(item.priceSatang)}`,
        keywords: `${item.nameEn} ${item.nameTh} ${item.category} menu`,
      }));
    const stock = countedItems
      .filter((item) => item.active)
      .map((item) => {
        const linked = stockSellableByCountedId.get(item.id);
        return {
          value: `stock:${item.id}`,
          label: linked
            ? `${bilingualItemLabel(item)} · stock · ${formatSatang(linked.priceSatang)}`
            : `${bilingualItemLabel(item)} · stock · set price`,
          keywords: `${item.nameEn} ${item.nameTh} stock counted`,
        };
      });
    return [...menu, ...stock];
  }, [sellables, countedItems, stockSellableByCountedId]);
  const clearWithoutStockIds = useMemo(
    () =>
      selected
        ? billLineSellableIdsWithoutStockCut(selected.lines, sellables)
        : [],
    [selected, sellables],
  );

  useEffect(() => {
    setSelectedId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    setConfirmClear(false);
    setStockPick(null);
  }, [selectedId]);

  useEffect(() => {
    if ((selected?.lines.length ?? 0) === 0) setConfirmClear(false);
  }, [selected?.lines.length]);

  useEffect(() => {
    if (selectedId) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router, selectedId]);

  function softUrl(next: string) {
    window.history.replaceState(null, "", next);
  }

  function closeBill() {
    setConfirmClear(false);
    setSelectedId(null);
    softUrl(returnTo);
  }

  function openBill(id: string) {
    setConfirmClear(false);
    setSelectedId(id);
    softUrl(`${returnTo}?open=${encodeURIComponent(id)}`);
  }

  const newBillForm = (
    <DeskQuietForm
      action={createBill}
      onSuccess={(result) => {
        if (result?.id) openBill(result.id);
      }}
    >
      {(pending) => (
        <>
          <input name="return-to" type="hidden" value={returnTo} />
          <button
            className="button button--primary"
            disabled={pending}
            type="submit"
          >
            {deskPendingLabel(pending, t("bills.new"), "Opening…")}
          </button>
        </>
      )}
    </DeskQuietForm>
  );

  return (
    <>
      <div className="staff-desk__panel">
        {bills.length ? (
          <div className="staff-desk__table-wrap">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.room")}</th>
                  <th>Date</th>
                  <th>{t("common.status")}</th>
                  <th>{t("bills.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr
                    className="staff-desk__click-row"
                    key={bill.id}
                    onClick={() => openBill(bill.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openBill(bill.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong>{bill.name}</strong>
                    </td>
                    <td>{bill.room || "—"}</td>
                    <td>{formatDate(bill.serviceDate, locale)}</td>
                    <td>
                      <span className={`desk-status desk-status--${bill.status}`}>
                        {bill.status === "open"
                          ? t("bills.open")
                          : t("bills.cleared")}
                      </span>
                    </td>
                    <td>{formatSatang(billTotalSatang(bill.lines, sellables))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("bills.noOpen")}</h2>
            <p>{t("bills.createHint")}</p>
            {newBillForm}
          </div>
        )}
      </div>

      <StaffDialog
        onClose={closeBill}
        open={Boolean(selected)}
        title={selected?.name ?? t("nav.bills")}
        footer={
          selected?.status === "open" ? (
            selected.lines.length === 0 ? (
              <p className="staff-desk__clear-empty">{t("bills.clearEmpty")}</p>
            ) : confirmClear ? (
              <DeskQuietForm
                action={clearBill}
                className="staff-desk__clear-confirm"
                onSuccess={() => closeBill()}
              >
                {(pending) => (
                  <>
                    <input name="bill-id" type="hidden" value={selected.id} />
                    <input name="return-to" type="hidden" value={returnTo} />
                    <p>
                      <strong>{selected.name}</strong>
                      {" · "}
                      {formatSatang(billTotalSatang(selected.lines, sellables))}
                    </p>
                    <p className="staff-desk__clear-confirm-note">
                      {t("bills.clearConfirmNote")}
                    </p>
                    {clearWithoutStockIds.length ? (
                      <p className="staff-desk__clear-confirm-note" role="status">
                        {t("bills.clearNoStockWarn").replace(
                          "{n}",
                          String(clearWithoutStockIds.length),
                        )}
                      </p>
                    ) : null}
                    <div className="staff-desk__clear-confirm-actions">
                      <button
                        className="button button--primary"
                        disabled={pending}
                        type="submit"
                      >
                        {deskPendingLabel(pending, t("bills.clearConfirm"))}
                      </button>
                      <button
                        className="button button--secondary"
                        disabled={pending}
                        onClick={() => setConfirmClear(false)}
                        type="button"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </>
                )}
              </DeskQuietForm>
            ) : (
              <button
                className="button button--primary"
                onClick={() => setConfirmClear(true)}
                type="button"
              >
                {t("bills.clear")}
              </button>
            )
          ) : null
        }
      >
        {selected ? (
          <>
            {selected.status === "open" ? (
              <DeskQuietForm action={updateBill} className="staff-desk__inline-form">
                {(pending) => (
                  <>
                <input name="bill-id" type="hidden" value={selected.id} />
                <input name="return-to" type="hidden" value={returnTo} />
                <div className="field-pair staff-desk__grow">
                  <label htmlFor="bill-name">{t("common.name")}</label>
                  <input
                    defaultValue={selected.name}
                    id="bill-name"
                    key={`name-${selected.id}-${selected.name}`}
                    name="name"
                    required
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="bill-room">{t("common.room")}</label>
                  <input
                    defaultValue={selected.room ?? ""}
                    id="bill-room"
                    key={`room-${selected.id}-${selected.room ?? ""}`}
                    name="room"
                    placeholder="204"
                  />
                </div>
                <button
                  className="button button--secondary"
                  disabled={pending}
                  type="submit"
                >
                  {deskPendingLabel(pending, t("common.save"))}
                </button>
                  </>
                )}
              </DeskQuietForm>
            ) : (
              <dl className="staff-desk__details">
                <div>
                  <dt>{t("common.room")}</dt>
                  <dd>{selected.room || "—"}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(selected.serviceDate, locale)}</dd>
                </div>
                <div>
                  <dt>{t("common.status")}</dt>
                  <dd>{t("bills.cleared")}</dd>
                </div>
                <div>
                  <dt>{t("bills.amount")}</dt>
                  <dd>
                    {formatSatang(billTotalSatang(selected.lines, sellables))}
                  </dd>
                </div>
              </dl>
            )}

            {selected.status === "open" ? (
              <dl className="staff-desk__details">
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(selected.serviceDate, locale)}</dd>
                </div>
                <div>
                  <dt>{t("bills.amount")}</dt>
                  <dd>
                    {formatSatang(billTotalSatang(selected.lines, sellables))}
                  </dd>
                </div>
              </dl>
            ) : null}

            {selected.lines.length ? (
              <div className="staff-desk__table-wrap">
                <table className="staff-desk__table">
                  <thead>
                    <tr>
                      <th>{t("bills.item")}</th>
                      <th>{t("bills.qty")}</th>
                      <th>{t("bills.unitPrice")}</th>
                      <th>{t("bills.amount")}</th>
                      <th>
                        <span className="sr-only">{t("common.edit")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => {
                      const item = sellablesById.get(line.sellableItemId);
                      return (
                        <tr key={line.id}>
                          <td>
                            {item ? bilingualItemLabel(item) : "Removed item"}
                          </td>
                          <td>{line.quantity}</td>
                          <td>
                            {selected.status === "open" ? (
                              <div onClick={(event) => event.stopPropagation()}>
                                <DeskQuietForm
                                  action={updateBillLinePrice}
                                  className="staff-desk__line-price"
                                >
                                  {(pending) => (
                                    <>
                                      <input
                                        name="bill-id"
                                        type="hidden"
                                        value={selected.id}
                                      />
                                      <input
                                        name="line-id"
                                        type="hidden"
                                        value={line.id}
                                      />
                                      <input
                                        name="return-to"
                                        type="hidden"
                                        value={returnTo}
                                      />
                                      <input
                                        aria-label={t("bills.unitPrice")}
                                        defaultValue={satangToBaht(
                                          line.unitPriceSatang,
                                        ).toFixed(2)}
                                        inputMode="decimal"
                                        min="0"
                                        name="unit-price-baht"
                                        step="0.01"
                                        type="number"
                                      />
                                      <button
                                        className="button button--quiet"
                                        disabled={pending}
                                        type="submit"
                                      >
                                        {deskPendingLabel(
                                          pending,
                                          t("common.save"),
                                          "…",
                                        )}
                                      </button>
                                    </>
                                  )}
                                </DeskQuietForm>
                              </div>
                            ) : (
                              formatSatang(line.unitPriceSatang)
                            )}
                          </td>
                          <td>
                            {item
                              ? formatSatang(lineAmountSatang(line, item))
                              : "-"}
                          </td>
                          <td>
                            {selected.status === "open" ? (
                              <div onClick={(event) => event.stopPropagation()}>
                                <DeskQuietForm action={removeBillLine}>
                                  {(pending) => (
                                    <>
                                      <input
                                        name="bill-id"
                                        type="hidden"
                                        value={selected.id}
                                      />
                                      <input
                                        name="line-id"
                                        type="hidden"
                                        value={line.id}
                                      />
                                      <input
                                        name="return-to"
                                        type="hidden"
                                        value={returnTo}
                                      />
                                      <button
                                        className="button button--quiet"
                                        disabled={pending}
                                        type="submit"
                                      >
                                        {deskPendingLabel(
                                          pending,
                                          t("common.remove"),
                                          "…",
                                        )}
                                      </button>
                                    </>
                                  )}
                                </DeskQuietForm>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="staff-desk__empty">{t("bills.noLines")}</p>
            )}

            {selected.status === "open" ? (
              <>
                <p className="staff-desk__hint">{t("bills.priceOverrideHint")}</p>
                <DeskQuietForm
                  action={addBillLine}
                  className="staff-desk__inline-form"
                  onSuccess={() => setStockPick(null)}
                  resetOnSuccess
                >
                  {(pending) => (
                    <>
                <input name="bill-id" type="hidden" value={selected.id} />
                <input name="return-to" type="hidden" value={returnTo} />
                <div className="field-pair staff-desk__grow">
                  <StaffCombo
                    clearOnSelect={false}
                    id="bill-item"
                    label={t("bills.addItem")}
                    name="sellable-item-id"
                    onSelect={(option) => {
                      if (!option?.value.startsWith("stock:")) {
                        setStockPick(null);
                        return;
                      }
                      const countedId = option.value.slice("stock:".length);
                      const counted = countedItems.find((entry) => entry.id === countedId);
                      const linked = stockSellableByCountedId.get(countedId);
                      const defaultSatang =
                        linked?.priceSatang ??
                        counted?.sellPriceSatang ??
                        0;
                      setStockPick({
                        countedId,
                        priceBaht:
                          defaultSatang > 0
                            ? String(satangToBaht(defaultSatang))
                            : "",
                      });
                    }}
                    options={itemOptions}
                    placeholder={t("desk.typeToSearch")}
                    required
                  />
                </div>
                {stockPick ? (
                  <div className="field-pair staff-desk__quantity">
                    <label htmlFor="bill-stock-price">
                      {t("bills.stockPrice")}
                    </label>
                    <input
                      id="bill-stock-price"
                      inputMode="decimal"
                      key={`stock-price-${stockPick.countedId}-${stockPick.priceBaht}`}
                      min="0"
                      name="stock-price-baht"
                      placeholder="0"
                      required={
                        !stockSellableByCountedId.has(stockPick.countedId) &&
                        !(
                          countedItems.find((entry) => entry.id === stockPick.countedId)
                            ?.sellPriceSatang
                        )
                      }
                      step="0.01"
                      type="number"
                      defaultValue={stockPick.priceBaht}
                    />
                  </div>
                ) : (
                  <div className="field-pair staff-desk__quantity">
                    <label htmlFor="bill-unit-price">{t("bills.unitPrice")}</label>
                    <input
                      id="bill-unit-price"
                      inputMode="decimal"
                      min="0"
                      name="unit-price-baht"
                      placeholder={t("bills.catalogPrice")}
                      step="0.01"
                      type="number"
                    />
                  </div>
                )}
                <div className="field-pair staff-desk__quantity">
                  <label htmlFor="bill-quantity">{t("bills.qty")}</label>
                  <input
                    defaultValue="1"
                    id="bill-quantity"
                    min="1"
                    name="quantity"
                    required
                    type="number"
                  />
                </div>
                <button
                  className="button button--secondary"
                  disabled={pending}
                  type="submit"
                >
                  {deskPendingLabel(pending, t("common.add"), "Adding…")}
                </button>
                    </>
                  )}
                </DeskQuietForm>
              </>
            ) : (
              <p className="form-message form-message--success" role="status">
                {t("bills.cleared")}{" "}
                {selected.clearedAt
                  ? formatDate(selected.clearedAt.slice(0, 10), locale)
                  : ""}
                .
              </p>
            )}
          </>
        ) : null}
      </StaffDialog>
    </>
  );
}

export function StaffNewBillButton({
  returnTo = "/staff/bills",
  label,
}: {
  returnTo?: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <DeskQuietForm
      action={createBill}
      onSuccess={(result) => {
        if (!result?.id) return;
        // Must use App Router navigation so ?open= reaches the page searchParams.
        router.push(`${returnTo}?open=${encodeURIComponent(result.id)}`);
      }}
    >
      {(pending) => (
        <>
          <input name="return-to" type="hidden" value={returnTo} />
          <button
            className="button button--primary"
            disabled={pending}
            type="submit"
          >
            {deskPendingLabel(pending, label, "Opening…")}
          </button>
        </>
      )}
    </DeskQuietForm>
  );
}
