"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createWalkInBooking,
  type WalkInBookingState,
} from "@/app/actions";
import { BookingSourceField } from "@/components/booking-source-field";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { staffCapacityErrorMessage } from "@/lib/booking-overbook";
import type { BookingSource } from "@/lib/booking-source";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import {
  calculateStayQuote,
  type RoomPromotionRate,
} from "@/lib/pricing";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import { MAX_STAY_NIGHTS, MIN_STAY_NIGHTS } from "@/lib/stay-dates";

type CalendarWalkInFormProps = {
  roomId: string;
  roomName: string;
  roomRate: number;
  date: string;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  dayHref: string;
  canManage: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  errorMessage?: string | null;
  roomUnitId?: string | null;
  roomUnitNumber?: string | null;
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
      return "Could not save these dates. Try again.";
    case "invalid-name":
      return "Enter guest name.";
    case "invalid-phone":
      return "Phone needs 7+ digits, or leave blank.";
    case "invalid-email":
      return "Enter a valid email, or leave blank.";
    case "invalid-dates":
      return `Pick ${MIN_STAY_NIGHTS}–${MAX_STAY_NIGHTS} nights.`;
    case "invalid-custom-total":
      return "Stay total must be 0 or more, or leave blank.";
    case "invalid-source":
      return "Choose a source.";
    case "capacity-verify-failed":
    case "unavailable":
    case "no-assignable-door":
    case "overbook":
      return staffCapacityErrorMessage(code);
    case "invalid-room-number":
      return "That door number is not available for this room type.";
    case "room-number-taken":
      return "That door is already taken for these dates.";
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
  fromIso,
  toIso,
  dayHref,
  canManage,
  currency,
  promotions,
  rateOverrides,
  errorMessage,
  roomUnitId = null,
  roomUnitNumber = null,
}: CalendarWalkInFormProps) {
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
        bookingSource: "walk-in",
        depositPaid: false,
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
  const [bookingSource, setBookingSource] = useState<BookingSource>("walk-in");
  const [depositPaid, setDepositPaid] = useState(false);
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
    setBookingSource(
      (state.values.bookingSource as BookingSource | "") || "walk-in",
    );
    setDepositPaid(state.values.depositPaid);
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

  const actionError = state.status === "error" ? walkInErrorCopy(state.error) : null;
  const displayError = actionError || errorMessage;
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
        New booking · <strong>{roomName}</strong>
        {roomUnitNumber ? (
          <>
            {" "}
            · <strong>#{roomUnitNumber}</strong>
          </>
        ) : null}
      </p>
      <p className="detail-help">
        Enter every stay here — website, walk-in, Airbnb, Booking.com, or Expedia.
        OTA stays get the same Conversation as walk-ins once saved.
        Past dates are allowed when you need to backfill an old booking. Pick the source
        below.
        {roomUnitNumber
          ? ` This stay will be assigned to door #${roomUnitNumber}.`
          : ""}
      </p>
      {displayError ? (
        <p className="form-message form-message--error" role="alert">
          {displayError}
        </p>
      ) : null}
      <form action={formAction} className="calendar-manage-form">
        <StaffFormBusyBridge />
        <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
        <input name="room-id" type="hidden" value={roomId} />
        {roomUnitId ? (
          <input name="room-unit-id" type="hidden" value={roomUnitId} />
        ) : null}
        {showEmail ? <input name="show-email" type="hidden" value="1" /> : null}
        {showTotal ? <input name="show-total" type="hidden" value="1" /> : null}
        <div className="field-pair">
          <label htmlFor="walk-in-guest-name">Guest</label>
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
          <label htmlFor="walk-in-guest-phone">Phone</label>
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
            min={arrival || undefined}
            name="departure"
            onChange={(event) => setDeparture(event.target.value)}
            required
            type="date"
            value={departure}
          />
        </div>

        {quoteLabel ? (
          <p className="detail-help" id="walk-in-quote">
            Usual rate: <strong>{quoteLabel}</strong>
            {quote.hasPromotion ? " (includes promo nights)" : ""}.
          </p>
        ) : null}

        {showEmail ? (
          <div className="field-pair">
            <label htmlFor="walk-in-guest-email">Email</label>
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
              Leave blank if the guest has no email. After you save, Conversation
              opens on the stay so you can message them here.
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
              inputMode="decimal"
              min={0}
              name="custom-total"
              onChange={(event) => setCustomTotal(event.target.value)}
              placeholder={quote.nights > 0 ? String(quote.total) : undefined}
              step="any"
              type="number"
              value={customTotal}
            />
            <span className="field-help" id={totalHelpId}>
              Leave blank to use the usual rate
              {quoteLabel ? ` (${quoteLabel})` : ""}. Zero is allowed.
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

        <div className="calendar-ops-row">
          <BookingSourceField
            disabled={!canManage || pending}
            id="walk-in-booking-source"
            onChange={setBookingSource}
            value={bookingSource}
          />
          <div className="field-pair field-pair--check">
            <label htmlFor="walk-in-deposit-paid">
              <input
                checked={depositPaid}
                disabled={!canManage || pending}
                id="walk-in-deposit-paid"
                name="deposit-paid"
                onChange={(event) => setDepositPaid(event.target.checked)}
                type="checkbox"
                value="1"
              />
              Paid
            </label>
            <span className="field-help">
              Leave unchecked if collecting later — the stay still holds the
              room.
            </span>
          </div>
        </div>

        <div className="field-pair field-pair--wide">
          <label htmlFor="walk-in-note">Note</label>
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
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      {!canManage ? (
        <p className="detail-help">Connect the site to book.</p>
      ) : null}
    </>
  );
}
