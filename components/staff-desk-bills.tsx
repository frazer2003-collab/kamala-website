"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addBillLine,
  clearBill,
  createBill,
  removeBillLine,
  updateBill,
} from "@/app/desk-actions";
import { StaffCombo } from "@/components/staff-combo";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { billTotalSatang } from "@/lib/desk-bills";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang } from "@/lib/desk-money";
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
  const selected = useMemo(
    () => bills.find((bill) => bill.id === selectedId) ?? null,
    [bills, selectedId],
  );
  const sellablesById = useMemo(
    () => new Map(sellables.map((item) => [item.id, item])),
    [sellables],
  );
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
      .map((item) => ({
        value: `stock:${item.id}`,
        label: `${bilingualItemLabel(item)} · stock`,
        keywords: `${item.nameEn} ${item.nameTh} stock counted`,
      }));
    return [...menu, ...stock];
  }, [sellables, countedItems]);

  useEffect(() => {
    setSelectedId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  function closeBill() {
    setSelectedId(null);
    router.replace(returnTo);
  }

  function openBill(id: string) {
    setSelectedId(id);
    router.replace(`${returnTo}?open=${encodeURIComponent(id)}`);
  }

  const newBillForm = (
    <form action={createBill}>
      <input name="return-to" type="hidden" value={returnTo} />
      <button className="button button--primary" type="submit">
        {t("bills.new")}
      </button>
    </form>
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
                        {bill.status}
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
            <form action={clearBill}>
              <input name="bill-id" type="hidden" value={selected.id} />
              <input name="return-to" type="hidden" value={returnTo} />
              <button className="button button--primary" type="submit">
                {t("bills.clear")}
              </button>
            </form>
          ) : null
        }
      >
        {selected ? (
          <>
            {selected.status === "open" ? (
              <form action={updateBill} className="staff-desk__inline-form">
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
                <button className="button button--secondary" type="submit">
                  {t("common.save")}
                </button>
              </form>
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
                  <dd>{selected.status}</dd>
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
                            {item
                              ? formatSatang(item.priceSatang * line.quantity)
                              : "-"}
                          </td>
                          <td>
                            {selected.status === "open" ? (
                              <form
                                action={removeBillLine}
                                onClick={(event) => event.stopPropagation()}
                              >
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
                                  type="submit"
                                >
                                  {t("common.remove")}
                                </button>
                              </form>
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
              <form action={addBillLine} className="staff-desk__inline-form">
                <input name="bill-id" type="hidden" value={selected.id} />
                <input name="return-to" type="hidden" value={returnTo} />
                <div className="field-pair staff-desk__grow">
                  <StaffCombo
                    clearOnSelect
                    id="bill-item"
                    label={t("bills.addItem")}
                    name="sellable-item-id"
                    options={itemOptions}
                    placeholder={t("desk.typeToSearch")}
                    required
                  />
                </div>
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
                <button className="button button--secondary" type="submit">
                  {t("common.add")}
                </button>
              </form>
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
  return (
    <form action={createBill}>
      <input name="return-to" type="hidden" value={returnTo} />
      <button className="button button--primary" type="submit">
        {label}
      </button>
    </form>
  );
}
