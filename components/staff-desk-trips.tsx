"use client";

import { useState } from "react";
import { createTourSale, deleteTourSale } from "@/app/desk-actions";
import { StaffDeskActionsMenu } from "@/components/staff-desk-actions-menu";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { formatSatang } from "@/lib/desk-money";
import type { DeskTourSale } from "@/lib/desk-ops-data";

function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
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
                  <th>{t("common.date")}</th>
                  <th>{t("trips.guests")}</th>
                  <th>{t("trips.amount")}</th>
                  <th>{t("common.note")}</th>
                  <th>
                    <span className="sr-only">{t("common.remove")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>{sale.name}</strong>
                      {sale.actedBy ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · {sale.actedBy}
                        </small>
                      ) : null}
                    </td>
                    <td>{formatDay(sale.saleDate, locale)}</td>
                    <td>{sale.guests}</td>
                    <td>{formatSatang(sale.amountSatang)}</td>
                    <td>{sale.staffNote || "—"}</td>
                    <td>
                      <DeskQuietForm action={deleteTourSale}>
                        {(pending) => (
                          <>
                            <input name="id" type="hidden" value={sale.id} />
                            <input
                              name="return-to"
                              type="hidden"
                              value={returnTo}
                            />
                            <button
                              className="button button--quiet button--compact"
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
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="trip-date">{t("common.date")}</label>
                  <input
                    defaultValue={todayIso}
                    id="trip-date"
                    name="sale-date"
                    required
                    type="date"
                  />
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
    </div>
  );
}
