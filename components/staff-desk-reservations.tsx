"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StaffDeskActionsMenu } from "@/components/staff-desk-actions-menu";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import {
  BOOKING_SOURCE_LABELS,
  BOOKING_SOURCES,
  type BookingSource,
} from "@/lib/booking-source";
import {
  defaultReservationsSortDir,
  ledgerFilterLabel,
  ledgerStatusLabel,
  nextReservationsSortDir,
  reservationsListHref,
  type LedgerStatusCounts,
  type ReservationRow,
  type ReservationsDateMode,
  type ReservationsLedgerFilter,
  type ReservationsPayFilter,
  type ReservationsSortDir,
  type ReservationsSortKey,
} from "@/lib/staff-reservations";

const LEDGER_FILTERS = [
  "all",
  "upcoming",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
  "no-show",
] as const satisfies readonly ReservationsLedgerFilter[];

const PAY_FILTERS = [
  "all",
  "Paid",
  "Unpaid",
  "No charge",
  "No price",
  "Transfer to verify",
] as const satisfies readonly ReservationsPayFilter[];

const SORT_COLUMNS: { key: ReservationsSortKey; labelKey: string }[] = [
  { key: "guest", labelKey: "reservations.guest" },
  { key: "stay", labelKey: "reservations.stay" },
  { key: "booked", labelKey: "reservations.booked" },
  { key: "room", labelKey: "common.room" },
  { key: "payment", labelKey: "reservations.payment" },
  { key: "status", labelKey: "common.status" },
];

type FilterBase = {
  from: string;
  to: string;
  dateMode: ReservationsDateMode;
  ledger: ReservationsLedgerFilter;
  source: BookingSource | "website" | "all";
  query: string;
  room: string;
  pay: ReservationsPayFilter;
  sort: ReservationsSortKey;
  dir: ReservationsSortDir;
};

function deskStatusTone(status: ReservationRow["ledgerStatus"]) {
  switch (status) {
    case "pending":
      return "warning";
    case "cancelled":
    case "no-show":
      return "cleared";
    case "completed":
      return "complete";
    default:
      return "open";
  }
}

export function StaffDeskReservations({
  rows,
  matchedCount,
  counts,
  filterBase,
  roomOptions,
  returnTo,
  initialOpenId = null,
  warnings = [],
}: {
  rows: ReservationRow[];
  matchedCount: number;
  counts: LedgerStatusCounts;
  filterBase: FilterBase;
  roomOptions: string[];
  returnTo: string;
  initialOpenId?: string | null;
  warnings?: string[];
}) {
  const { t } = useStaffLocale();
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    setSelectedId(initialOpenId);
  }, [initialOpenId]);

  function softUrl(next: string) {
    window.history.replaceState(null, "", next);
  }

  function closeRow() {
    setSelectedId(null);
    softUrl(returnTo);
  }

  function openRow(id: string) {
    setSelectedId(id);
    softUrl(reservationsListHref({ ...filterBase, open: id }));
  }

  const filterForm = (
    <form
      action="/staff/reservations"
      className="staff-desk__form staff-desk__form--dialog"
      method="get"
    >
      <input name="month" type="hidden" value={filterBase.from.slice(0, 7)} />
      <input name="from" type="hidden" value={filterBase.from} />
      <input name="to" type="hidden" value={filterBase.to} />
      {filterBase.dateMode !== "stay" ? (
        <input name="by" type="hidden" value={filterBase.dateMode} />
      ) : null}
      {filterBase.ledger !== "all" ? (
        <input name="ledger" type="hidden" value={filterBase.ledger} />
      ) : null}
      {filterBase.source !== "all" ? (
        <input name="source" type="hidden" value={filterBase.source} />
      ) : null}
      {filterBase.sort !== "booked" ? (
        <input name="sort" type="hidden" value={filterBase.sort} />
      ) : null}
      {filterBase.dir !== defaultReservationsSortDir(filterBase.sort) ? (
        <input name="dir" type="hidden" value={filterBase.dir} />
      ) : null}
      <div className="field-pair">
        <label htmlFor="reservations-q">{t("common.find")}</label>
        <input
          autoComplete="off"
          defaultValue={filterBase.query}
          id="reservations-q"
          name="q"
          placeholder={t("reservations.findPlaceholder")}
          type="search"
        />
      </div>
      <div className="staff-desk__field-grid">
        <div className="field-pair">
          <label htmlFor="reservations-room">{t("common.room")}</label>
          <select
            defaultValue={filterBase.room}
            id="reservations-room"
            name="room"
          >
            <option value="">{t("reservations.allRooms")}</option>
            {roomOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field-pair">
          <label htmlFor="reservations-pay">{t("reservations.payment")}</label>
          <select
            defaultValue={filterBase.pay === "all" ? "" : filterBase.pay}
            id="reservations-pay"
            name="pay"
          >
            {PAY_FILTERS.map((option) => (
              <option key={option} value={option === "all" ? "" : option}>
                {option === "all" ? t("reservations.allPayments") : option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="button button--primary" type="submit">
        {t("common.search")}
      </button>
    </form>
  );

  return (
    <div className="staff-desk__list-shell">
      <div className="staff-desk__list-toolbar staff-desk__list-toolbar--slim">
        <span className="staff-desk__toolbar-meta">
          {rows.length
            ? `${rows.length} ${t("reservations.countLabel")}${
                matchedCount !== rows.length
                  ? ` · ${matchedCount} ${t("reservations.matched")}`
                  : ""
              }`
            : t("reservations.empty")}
        </span>
        <StaffDeskActionsMenu label={t("common.actions")}>
          <div className="staff-desk__actions-item staff-desk__actions-item--form">
            {filterForm}
          </div>
        </StaffDeskActionsMenu>
      </div>

      {warnings.map((message) => (
        <p
          className="form-message form-message--warning"
          key={message}
          role="status"
        >
          {message} {t("reservations.partialWarn")}
        </p>
      ))}

      <div
        className="staff-desk__filter-row"
        aria-label={t("reservations.statusFilter")}
        role="group"
      >
        {LEDGER_FILTERS.map((key) => (
          <Link
            aria-current={filterBase.ledger === key ? "true" : undefined}
            className={[
              "staff-desk__chip",
              filterBase.ledger === key ? "staff-desk__chip--active" : "",
              key === "pending" && counts.pending > 0
                ? "staff-desk__chip--urgent"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={reservationsListHref({ ...filterBase, ledger: key })}
            key={key}
            prefetch={false}
          >
            {ledgerFilterLabel(key)} · {counts[key]}
          </Link>
        ))}
      </div>

      <div
        className="staff-desk__filter-row"
        aria-label={t("reservations.sourceFilter")}
        role="group"
      >
        <Link
          aria-current={filterBase.source === "all" ? "true" : undefined}
          className={[
            "staff-desk__chip",
            filterBase.source === "all" ? "staff-desk__chip--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          href={reservationsListHref({ ...filterBase, source: "all" })}
          prefetch={false}
        >
          {t("reservations.allSources")}
        </Link>
        {BOOKING_SOURCES.map((value) => (
          <Link
            aria-current={filterBase.source === value ? "true" : undefined}
            className={[
              "staff-desk__chip",
              filterBase.source === value ? "staff-desk__chip--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={reservationsListHref({ ...filterBase, source: value })}
            key={value}
            prefetch={false}
          >
            {BOOKING_SOURCE_LABELS[value]}
          </Link>
        ))}
      </div>

      <div className="staff-desk__panel staff-desk__panel--fill">
        {rows.length ? (
          <div className="staff-desk__table-wrap staff-desk__table-wrap--fill">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  {SORT_COLUMNS.map((column) => {
                    const active = filterBase.sort === column.key;
                    const nextDir = nextReservationsSortDir(
                      filterBase.sort,
                      filterBase.dir,
                      column.key,
                    );
                    return (
                      <th
                        aria-sort={
                          active
                            ? filterBase.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        key={column.key}
                        scope="col"
                      >
                        <Link
                          className={[
                            "staff-desk__sort",
                            active ? "staff-desk__sort--active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          href={reservationsListHref({
                            ...filterBase,
                            sort: column.key,
                            dir: nextDir,
                          })}
                          prefetch={false}
                        >
                          <span>{t(column.labelKey)}</span>
                          <span aria-hidden="true">
                            {active
                              ? filterBase.dir === "asc"
                                ? " ↑"
                                : " ↓"
                              : ""}
                          </span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className={[
                      "staff-desk__click-row",
                      row.needsRoom ? "staff-desk__click-row--urgent" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={`${row.kind}-${row.id}`}
                    onClick={() => openRow(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRow(row.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>
                      <strong>{row.label}</strong>
                      {row.phone ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · {row.phone}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <span>
                        {row.checkInLabel} → {row.checkOutLabel}
                      </span>
                      <small className="staff-desk__muted">
                        {" "}
                        · {row.nights}{" "}
                        {row.nights === 1
                          ? t("reservations.night")
                          : t("reservations.nights")}
                      </small>
                    </td>
                    <td>{row.bookedLabel ?? "—"}</td>
                    <td>
                      {row.sublabel}
                      {row.doorLabel ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · {row.doorLabel}
                        </small>
                      ) : row.needsRoom ? (
                        <small className="staff-desk__muted staff-desk__muted--warn">
                          {" "}
                          · {t("reservations.needsRoom")}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      {row.moneyLabel ? (
                        <>
                          <strong>{row.moneyLabel}</strong>
                          <small className="staff-desk__muted">
                            {" "}
                            · {row.payLabel}
                          </small>
                        </>
                      ) : (
                        row.payLabel
                      )}
                    </td>
                    <td>
                      <span
                        className={`desk-status desk-status--${deskStatusTone(row.ledgerStatus)}`}
                      >
                        {ledgerStatusLabel(row.ledgerStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("reservations.empty")}</h2>
            <p>{t("reservations.emptyHint")}</p>
            <Link
              className="button button--secondary"
              href={reservationsListHref({
                from: filterBase.from,
                to: filterBase.to,
              })}
              prefetch={false}
            >
              {t("reservations.showAll")}
            </Link>
          </div>
        )}
      </div>

      <StaffDialog
        closeLabel={t("common.close")}
        onClose={closeRow}
        open={Boolean(selected)}
        title={selected?.label ?? t("reservations.title")}
        footer={
          selected ? (
            <Link
              className="button button--primary"
              href={selected.href}
              prefetch={false}
            >
              {t("reservations.openCalendar")}
            </Link>
          ) : null
        }
      >
        {selected ? (
          <dl className="staff-desk__detail-list">
            <div>
              <dt>{t("reservations.stay")}</dt>
              <dd>
                {selected.checkInLabel} → {selected.checkOutLabel}
                {" · "}
                {selected.nights}{" "}
                {selected.nights === 1
                  ? t("reservations.night")
                  : t("reservations.nights")}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.booked")}</dt>
              <dd>{selected.bookedLabel ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("common.room")}</dt>
              <dd>
                {selected.sublabel}
                {selected.doorLabel
                  ? ` · ${selected.doorLabel}`
                  : selected.needsRoom
                    ? ` · ${t("reservations.needsRoom")}`
                    : ""}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.source")}</dt>
              <dd>{selected.sourceLabel}</dd>
            </div>
            <div>
              <dt>{t("reservations.payment")}</dt>
              <dd>
                {[selected.moneyLabel, selected.payLabel]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt>{t("common.status")}</dt>
              <dd>
                {ledgerStatusLabel(selected.ledgerStatus)}
                {selected.statusLabel !==
                ledgerStatusLabel(selected.ledgerStatus)
                  ? ` · ${selected.statusLabel}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.phone")}</dt>
              <dd>{selected.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("reservations.email")}</dt>
              <dd>{selected.email ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </StaffDialog>
    </div>
  );
}
