"use client";

import Link from "next/link";
import { useState } from "react";
import {
  createTourSale,
  deleteTourSale,
  updateTourSalePayment,
} from "@/app/desk-actions";
import { StaffDeskActionsMenu } from "@/components/staff-desk-actions-menu";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { formatSatang } from "@/lib/desk-money";
import {
  DESK_TOUR_PAYMENT_STATUSES,
  type DeskTourPaymentStatus,
  type DeskTourSale,
} from "@/lib/desk-ops-data";

function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function paymentLabel(status: DeskTourPaymentStatus, t: (key: string) => string) {
  switch (status) {
    case "stripe":
      return t("trips.payStripe");
    case "qr":
      return t("trips.payQr");
    case "cash":
      return t("trips.payCash");
    default:
      return t("trips.payUnpaid");
  }
}

export function StaffDeskTrips({
  sales,
  totalSatang,
  todayIso,
  returnTo,
}: {
  sales: DeskTourSale[];
  totalSatang: number;
  todayIso: string;
  returnTo: string;
}) {
  const { t, locale } = useStaffLocale();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sales.find((sale) => sale.id === selectedId) ?? null;

  return (
    <div className="staff-desk__list-shell staff-desk__expenses">
      <div className="staff-desk__list-toolbar staff-desk__list-toolbar--slim">
        <span className="staff-desk__toolbar-meta">
          {sales.length
            ? `${sales.length} ${t("trips.countLabel")}`
            : t("trips.empty")}
        </span>
        <StaffDeskActionsMenu label={t("common.actions")}>
          <button
            className="staff-desk__actions-item"
            onClick={() => setAdding(true)}
            role="menuitem"
            type="button"
          >
            {t("trips.add")}
          </button>
        </StaffDeskActionsMenu>
      </div>

      <div className="staff-desk__panel staff-desk__panel--fill">
        {sales.length ? (
          <div className="staff-desk__table-wrap staff-desk__table-wrap--fill">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("trips.name")}</th>
                  <th>{t("trips.tripDate")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("trips.guests")}</th>
                  <th>{t("trips.amount")}</th>
                  <th>
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr
                    className="staff-desk__click-row"
                    key={sale.id}
                    onClick={() => setSelectedId(sale.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(sale.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong>{sale.name}</strong>
                      {sale.guestName ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · {sale.guestName}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      {formatDay(sale.tripDate || sale.saleDate, locale)}
                      {sale.tripDate && sale.tripDate !== sale.saleDate ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · sold {formatDay(sale.saleDate, locale)}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`desk-status desk-status--${
                          sale.paymentStatus === "unpaid" ? "warning" : "paid"
                        }`}
                      >
                        {paymentLabel(sale.paymentStatus, t)}
                      </span>
                    </td>
                    <td>{sale.guests}</td>
                    <td>{formatSatang(sale.amountSatang)}</td>
                    <td>
                      <Link
                        className="button button--quiet button--compact"
                        href={`/staff/trips/slip/${sale.id}`}
                        onClick={(event) => event.stopPropagation()}
                        prefetch={false}
                        target="_blank"
                      >
                        {t("trips.slip")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("trips.empty")}</h2>
            <p>{t("trips.emptyHint")}</p>
            <button
              className="button button--primary"
              onClick={() => setAdding(true)}
              type="button"
            >
              {t("trips.add")}
            </button>
          </div>
        )}
      </div>

      <footer className="staff-desk__list-footer">
        <span>
          {sales.length} {t("trips.countLabel")}
        </span>
        <strong>
          {t("desk.rangeTotal")}: {formatSatang(totalSatang)}
        </strong>
      </footer>

      <StaffDialog
        onClose={() => setAdding(false)}
        open={adding}
        title={t("trips.add")}
      >
        <DeskQuietForm
          action={createTourSale}
          className="staff-desk__form staff-desk__form--dialog"
          resetOnSuccess
          onSuccess={() => setAdding(false)}
        >
          {(pending) => (
            <>
              <input name="return-to" type="hidden" value={returnTo} />
              <div className="field-pair">
                <label htmlFor="trip-name">{t("trips.name")}</label>
                <input id="trip-name" name="name" required />
              </div>
              <div className="field-pair">
                <label htmlFor="trip-guest">{t("trips.guest")}</label>
                <input id="trip-guest" name="guest-name" />
              </div>
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="trip-phone">{t("trips.phone")}</label>
                  <input id="trip-phone" name="guest-phone" />
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-email">{t("trips.email")}</label>
                  <input id="trip-email" name="guest-email" type="email" />
                </div>
              </div>
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="trip-run-date">{t("trips.tripDate")}</label>
                  <input
                    defaultValue={todayIso}
                    id="trip-run-date"
                    name="trip-date"
                    required
                    type="date"
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-pickup">{t("trips.pickupTime")}</label>
                  <input
                    id="trip-pickup"
                    name="pickup-time"
                    type="time"
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-sale-date">{t("trips.soldDate")}</label>
                  <input
                    defaultValue={todayIso}
                    id="trip-sale-date"
                    name="sale-date"
                    required
                    type="date"
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-pay">{t("common.status")}</label>
                  <select
                    defaultValue="unpaid"
                    id="trip-pay"
                    name="payment-status"
                  >
                    {DESK_TOUR_PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {paymentLabel(status, t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-guests">{t("trips.guests")}</label>
                  <input
                    defaultValue={1}
                    id="trip-guests"
                    inputMode="numeric"
                    min={1}
                    name="guests"
                    required
                    step={1}
                    type="number"
                  />
                </div>
                <div className="field-pair">
                  <label htmlFor="trip-amount">{t("trips.amount")}</label>
                  <input
                    id="trip-amount"
                    inputMode="decimal"
                    min={0}
                    name="amount-baht"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>
              <div className="field-pair">
                <label htmlFor="trip-note">{t("common.note")}</label>
                <textarea id="trip-note" name="staff-note" rows={2} />
              </div>
              <button
                className="button button--primary"
                disabled={pending}
                type="submit"
              >
                {deskPendingLabel(pending, t("trips.add"), t("common.saving"))}
              </button>
            </>
          )}
        </DeskQuietForm>
      </StaffDialog>

      <StaffDialog
        onClose={() => setSelectedId(null)}
        open={Boolean(selected)}
        title={selected?.name ?? t("trips.title")}
        footer={
          selected ? (
            <div className="staff-desk__dialog-actions">
              <Link
                className="button button--primary"
                href={`/staff/trips/slip/${selected.id}`}
                prefetch={false}
                target="_blank"
              >
                {t("trips.printSlip")}
              </Link>
              <DeskQuietForm action={deleteTourSale}>
                {(pending) => (
                  <>
                    <input name="id" type="hidden" value={selected.id} />
                    <input name="return-to" type="hidden" value={returnTo} />
                    <button
                      className="button button--secondary"
                      disabled={pending}
                      type="submit"
                    >
                      {deskPendingLabel(
                        pending,
                        t("common.remove"),
                        t("common.saving"),
                      )}
                    </button>
                  </>
                )}
              </DeskQuietForm>
            </div>
          ) : null
        }
      >
        {selected ? (
          <>
            <dl className="staff-desk__detail-list">
              <div>
                <dt>{t("trips.guest")}</dt>
                <dd>{selected.guestName || "—"}</dd>
              </div>
              <div>
                <dt>{t("trips.tripDate")}</dt>
                <dd>
                  {formatDay(selected.tripDate || selected.saleDate, locale)}
                </dd>
              </div>
              <div>
                <dt>{t("trips.soldDate")}</dt>
                <dd>{formatDay(selected.saleDate, locale)}</dd>
              </div>
              <div>
                <dt>{t("trips.amount")}</dt>
                <dd>{formatSatang(selected.amountSatang)}</dd>
              </div>
              <div>
                <dt>{t("trips.phone")}</dt>
                <dd>{selected.guestPhone || "—"}</dd>
              </div>
              <div>
                <dt>{t("trips.email")}</dt>
                <dd>{selected.guestEmail || "—"}</dd>
              </div>
            </dl>
            <DeskQuietForm
              action={updateTourSalePayment}
              className="staff-desk__form staff-desk__form--dialog"
              onSuccess={() => setSelectedId(null)}
            >
              {(pending) => (
                <>
                  <input name="id" type="hidden" value={selected.id} />
                  <input name="return-to" type="hidden" value={returnTo} />
                  <div className="field-pair">
                    <label htmlFor="trip-edit-pay">{t("common.status")}</label>
                    <select
                      defaultValue={selected.paymentStatus}
                      id="trip-edit-pay"
                      name="payment-status"
                    >
                      {DESK_TOUR_PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {paymentLabel(status, t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="button button--secondary"
                    disabled={pending}
                    type="submit"
                  >
                    {deskPendingLabel(
                      pending,
                      t("trips.saveStatus"),
                      t("common.saving"),
                    )}
                  </button>
                </>
              )}
            </DeskQuietForm>
          </>
        ) : null}
      </StaffDialog>
    </div>
  );
}
