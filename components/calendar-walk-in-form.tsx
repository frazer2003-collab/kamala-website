"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createWalkInBooking } from "@/app/actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { getTodayIso } from "@/lib/calendar";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import {
  calculateStayQuote,
  type RoomPromotionRate,
} from "@/lib/pricing";

type CalendarWalkInFormProps = {
  roomId: string;
  roomName: string;
  roomRate: number;
  date: string;
  monthKey: string;
  dayHref: string;
  canManage: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  errorMessage?: string | null;
};

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarWalkInForm({
  roomId,
  roomName,
  roomRate,
  date,
  monthKey,
  dayHref,
  canManage,
  currency,
  promotions,
  rateOverrides,
  errorMessage,
}: CalendarWalkInFormProps) {
  const todayIso = useMemo(() => getTodayIso(), []);
  const [arrival, setArrival] = useState(date);
  const [departure, setDeparture] = useState(() => addIsoDays(date, 1));
  const [showEmail, setShowEmail] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState("");

  const quote = useMemo(() => {
    const overrides = new Map(Object.entries(rateOverrides));
    return calculateStayQuote({
      roomId,
      baseRate: roomRate,
      arrival,
      departure,
      promotions,
      rateOverrides: overrides,
    });
  }, [arrival, departure, promotions, rateOverrides, roomId, roomRate]);

  const quoteLabel =
    quote.nights > 0
      ? `${formatMoneySuffix(quote.total, currency)} · ${quote.nights} night${quote.nights === 1 ? "" : "s"}`
      : null;

  const totalHelpId = "walk-in-custom-total-help";
  const emailHelpId = "walk-in-guest-email-help";

  return (
    <>
      <p className="calendar-day-panel__intro">
        Add a confirmed walk-in for <strong>{roomName}</strong>, starting{" "}
        {new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
        }).format(new Date(`${date}T00:00:00`))}
        .
      </p>
      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form action={createWalkInBooking} className="calendar-manage-form">
        <StaffFormBusyBridge />
        <input name="month" type="hidden" value={monthKey} />
        <input name="room-id" type="hidden" value={roomId} />
        <div className="field-pair">
          <label htmlFor="walk-in-guest-name">Guest name</label>
          <input
            autoComplete="name"
            disabled={!canManage}
            id="walk-in-guest-name"
            name="guest-name"
            required
            type="text"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="walk-in-guest-phone">Phone number (optional)</label>
          <input
            autoComplete="tel"
            disabled={!canManage}
            id="walk-in-guest-phone"
            inputMode="tel"
            name="guest-phone"
            type="tel"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="walk-in-arrival">Arrival</label>
          <input
            disabled={!canManage}
            id="walk-in-arrival"
            min={todayIso}
            name="arrival"
            onChange={(event) => setArrival(event.target.value)}
            required
            type="date"
            value={arrival}
          />
        </div>
        <div className="field-pair">
          <label htmlFor="walk-in-departure">Departure</label>
          <input
            disabled={!canManage}
            id="walk-in-departure"
            min={todayIso}
            name="departure"
            onChange={(event) => setDeparture(event.target.value)}
            required
            type="date"
            value={departure}
          />
        </div>

        {quoteLabel ? (
          <p className="detail-help" id="walk-in-quote">
            Usual rate for these dates: <strong>{quoteLabel}</strong>
            {quote.hasPromotion ? " (includes promo nights)" : ""}.
          </p>
        ) : null}

        {showEmail ? (
          <div className="field-pair">
            <label htmlFor="walk-in-guest-email">Email (optional)</label>
            <input
              aria-describedby={emailHelpId}
              autoComplete="email"
              disabled={!canManage}
              id="walk-in-guest-email"
              name="guest-email"
              type="email"
            />
            <span className="field-help" id={emailHelpId}>
              Leave blank if the guest has no email.
            </span>
          </div>
        ) : (
          <div className="field-pair field-pair--wide">
            <button
              className="button button--quiet"
              disabled={!canManage}
              onClick={() => setShowEmail(true)}
              type="button"
            >
              Add email
            </button>
          </div>
        )}

        {showTotal ? (
          <div className="field-pair">
            <label htmlFor="walk-in-custom-total">
              Stay total (optional, {currency.toUpperCase()})
            </label>
            <input
              aria-describedby={totalHelpId}
              disabled={!canManage}
              id="walk-in-custom-total"
              inputMode="numeric"
              min={0}
              name="custom-total"
              onChange={(event) => setCustomTotal(event.target.value)}
              placeholder={quote.nights > 0 ? String(quote.total) : undefined}
              step={1}
              type="number"
              value={customTotal}
            />
            <span className="field-help" id={totalHelpId}>
              Leave blank to use the usual rate
              {quoteLabel ? ` (${quoteLabel})` : ""}.
            </span>
          </div>
        ) : (
          <div className="field-pair field-pair--wide">
            <button
              className="button button--quiet"
              disabled={!canManage}
              onClick={() => setShowTotal(true)}
              type="button"
            >
              Adjust stay total
            </button>
          </div>
        )}

        <div className="field-pair field-pair--wide">
          <label htmlFor="walk-in-note">Staff note</label>
          <textarea
            disabled={!canManage}
            id="walk-in-note"
            name="staff-note"
            rows={3}
          />
        </div>
        <div className="calendar-day-panel__actions">
          <Link className="button button--quiet" href={dayHref}>
            Back
          </Link>
          <button className="button button--primary" disabled={!canManage} type="submit">
            Save walk-in
          </button>
        </div>
      </form>
      {!canManage ? (
        <p className="detail-help">
          Connect the site to save walk-ins from the calendar.
        </p>
      ) : null}
    </>
  );
}
