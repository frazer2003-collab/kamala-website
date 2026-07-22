"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createWalkInBooking,
  type WalkInBookingState,
} from "@/app/actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import {
  OVERBOOK_SAVE_ANYWAY_HINT,
  staffCapacityErrorMessage,
} from "@/lib/booking-overbook";
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

function walkInErrorCopy(code?: string) {
  switch (code) {
    case "past-date":
      return "Walk-ins can only start from today onward.";
    case "invalid-name":
      return "Enter the guest name before saving the walk-in.";
    case "invalid-phone":
      return "Enter a valid phone number with at least 7 digits, or leave phone blank.";
    case "invalid-email":
      return "Enter a valid email, or leave blank if the guest has no email.";
    case "invalid-dates":
      return "Choose a valid date range (1–21 nights).";
    case "invalid-custom-total":
      return "Enter a stay total of 0 or more, or leave blank to use the usual rate for these dates.";
    case "capacity-verify-failed":
    case "overbook":
      return staffCapacityErrorMessage(code);
    case "save-failed":
      return "Could not save. Try again, or ask whoever set up the site if the problem continues.";
    default:
      return null;
  }
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
  const initialState = useMemo<WalkInBookingState>(
    () => ({
      status: "idle",
      values: {
        guestName: "",
        guestPhone: "",
        guestEmail: "",
        arrival: date,
        departure: addIsoDays(date, 1),
        staffNote: "",
        customTotal: "",
        showEmail: false,
        showTotal: false,
      },
    }),
    [date],
  );
  const [state, formAction, pending] = useActionState(createWalkInBooking, initialState);
  const [arrival, setArrival] = useState(initialState.values.arrival);
  const [departure, setDeparture] = useState(initialState.values.departure);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [customTotal, setCustomTotal] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showTotal, setShowTotal] = useState(false);

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }
    setGuestName(state.values.guestName);
    setGuestPhone(state.values.guestPhone);
    setGuestEmail(state.values.guestEmail);
    setArrival(state.values.arrival);
    setDeparture(state.values.departure);
    setStaffNote(state.values.staffNote);
    setCustomTotal(state.values.customTotal);
    setShowEmail(state.values.showEmail || Boolean(state.values.guestEmail));
    setShowTotal(state.values.showTotal || Boolean(state.values.customTotal));
  }, [state]);

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

  const actionError =
    state.status === "error" || state.status === "overbook"
      ? walkInErrorCopy(state.error)
      : null;
  const displayError = actionError || errorMessage;
  const needsOverbookConfirm = state.status === "overbook";
  const totalHelpId = "walk-in-custom-total-help";
  const emailHelpId = "walk-in-guest-email-help";
  const nameInvalid = state.error === "invalid-name";
  const emailInvalid = state.error === "invalid-email";
  const phoneInvalid = state.error === "invalid-phone";
  const datesInvalid =
    state.error === "invalid-dates" || state.error === "past-date";
  const totalInvalid = state.error === "invalid-custom-total";

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
      {displayError ? (
        <p className="form-message form-message--error" role="alert">
          {displayError}
          {needsOverbookConfirm ? OVERBOOK_SAVE_ANYWAY_HINT : null}
        </p>
      ) : null}
      <form action={formAction} className="calendar-manage-form">
        <StaffFormBusyBridge />
        <input name="month" type="hidden" value={monthKey} />
        <input name="room-id" type="hidden" value={roomId} />
        {showEmail ? <input name="show-email" type="hidden" value="1" /> : null}
        {showTotal ? <input name="show-total" type="hidden" value="1" /> : null}
        {needsOverbookConfirm ? (
          <input name="overbook-confirm" type="hidden" value="1" />
        ) : null}
        <div className="field-pair">
          <label htmlFor="walk-in-guest-name">Guest name</label>
          <input
            aria-invalid={nameInvalid || undefined}
            autoComplete="name"
            disabled={!canManage || pending}
            id="walk-in-guest-name"
            name="guest-name"
            onChange={(event) => setGuestName(event.target.value)}
            required
            type="text"
            value={guestName}
          />
        </div>
        <div className="field-pair">
          <label htmlFor="walk-in-guest-phone">Phone number (optional)</label>
          <input
            aria-invalid={phoneInvalid || undefined}
            autoComplete="tel"
            disabled={!canManage || pending}
            id="walk-in-guest-phone"
            inputMode="tel"
            name="guest-phone"
            onChange={(event) => setGuestPhone(event.target.value)}
            type="tel"
            value={guestPhone}
          />
        </div>
        <div className="field-pair">
          <label htmlFor="walk-in-arrival">Arrival</label>
          <input
            aria-invalid={datesInvalid || undefined}
            disabled={!canManage || pending}
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
            aria-invalid={datesInvalid || undefined}
            disabled={!canManage || pending}
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
              aria-invalid={emailInvalid || undefined}
              autoComplete="email"
              disabled={!canManage || pending}
              id="walk-in-guest-email"
              name="guest-email"
              onChange={(event) => setGuestEmail(event.target.value)}
              type="email"
              value={guestEmail}
            />
            <span className="field-help" id={emailHelpId}>
              Leave blank if the guest has no email.
            </span>
          </div>
        ) : (
          <div className="field-pair field-pair--wide">
            <button
              className="button button--quiet"
              disabled={!canManage || pending}
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
              aria-invalid={totalInvalid || undefined}
              disabled={!canManage || pending}
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
              disabled={!canManage || pending}
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
            disabled={!canManage || pending}
            id="walk-in-note"
            name="staff-note"
            onChange={(event) => setStaffNote(event.target.value)}
            rows={3}
            value={staffNote}
          />
        </div>
        <div className="calendar-day-panel__actions">
          <Link className="button button--quiet" href={dayHref}>
            Back
          </Link>
          <button className="button button--primary" disabled={!canManage || pending} type="submit">
            {needsOverbookConfirm
              ? pending
                ? "Saving…"
                : "Save anyway"
              : pending
                ? "Saving…"
                : "Save walk-in"}
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
