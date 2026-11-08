"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createWalkInBooking,
  type WalkInBookingState,
} from "@/app/actions";
import { BookingSourceField } from "@/components/booking-source-field";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { staffCapacityErrorMessage } from "@/lib/booking-overbook";
import {
  formatBookingSource,
  isOtaBookingSource,
  type BookingSource,
} from "@/lib/booking-source";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import {
  calculateStayQuote,
  type RoomPromotionRate,
} from "@/lib/pricing";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import { MAX_STAY_NIGHTS, MIN_STAY_NIGHTS } from "@/lib/stay-dates";
import {
  alignDepartureToArrival,
  departureBoundsForArrival,
  shiftIsoDate,
} from "@/lib/walk-in-stay-dates";

/** Longest name the booking_requests row accepts without truncation surprises. */
const GUEST_NAME_MAX = 120;

type CalendarWalkInFormProps = {
  roomId: string;
  roomName: string;
  roomRate: number;
  date: string;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  onBack: () => void;
  canManage: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  errorMessage?: string | null;
  roomUnitId?: string | null;
  roomUnitNumber?: string | null;
};

type WalkInFields = {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  arrival: string;
  departure: string;
  staffNote: string;
  customTotal: string;
  bookingSource: BookingSource;
  bedSetup: "" | "TWN" | "DBL";
  depositPaid: boolean;
  paymentCollectedVia: string;
  showEmail: boolean;
  showTotal: boolean;
};

function bedCodeFromValue(value: string): "" | "TWN" | "DBL" {
  const normalized = value.trim().toUpperCase();
  if (normalized === "TWN" || normalized === "TWIN") return "TWN";
  if (normalized === "DBL" || normalized === "DOUBLE" || normalized === "KING") {
    return "DBL";
  }
  return "";
}

function fieldsFromValues(values: WalkInBookingState["values"]): WalkInFields {
  return {
    guestName: values.guestName,
    guestPhone: values.guestPhone,
    guestEmail: values.guestEmail,
    arrival: values.arrival,
    departure: values.departure,
    staffNote: values.staffNote,
    customTotal: values.customTotal,
    bookingSource: (values.bookingSource as BookingSource | "") || "walk-in",
    bedSetup: bedCodeFromValue(values.bedSetup ?? ""),
    depositPaid: values.depositPaid,
    paymentCollectedVia: values.paymentCollectedVia || "",
    // A returned email or total means the field was open when staff submitted.
    showEmail: values.showEmail || Boolean(values.guestEmail),
    showTotal: values.showTotal || Boolean(values.customTotal),
  };
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
    case "invalid-room":
      return "That room type is no longer set up. Reload the calendar and try again.";
    case "invalid-dates":
      return `Pick ${MIN_STAY_NIGHTS}–${MAX_STAY_NIGHTS} nights.`;
    case "invalid-custom-total":
      return "Stay total must be 0 or more, or leave blank.";
    case "invalid-source":
      return "Choose a source.";
    case "invalid-bed":
      return "Choose bed type: TWN or DBL.";
    case "payment-method":
      return "Choose Cash or Thai bank when marking Paid (not needed for OTAs).";
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
  onBack,
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
        departure: shiftIsoDate(date, MIN_STAY_NIGHTS),
        staffNote: "",
        customTotal: "",
        bookingSource: "walk-in",
        bedSetup: "",
        depositPaid: false,
        paymentCollectedVia: "",
        showEmail: false,
        showTotal: false,
      },
    }),
    [date],
  );
  const [state, formAction, pending] = useActionState(createWalkInBooking, initialState);
  const [fields, setFields] = useState(() => fieldsFromValues(initialState.values));
  const [syncedState, setSyncedState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLInputElement>(null);
  const revealTarget = useRef<"email" | "total" | null>(null);

  // A rejected save returns what staff typed. Adopt it in one update during
  // render rather than a chain of setState calls in an effect.
  if (syncedState !== state) {
    setSyncedState(state);
    if (state.status !== "idle") {
      setFields(fieldsFromValues(state.values));
    }
  }

  const {
    arrival,
    departure,
    guestName,
    guestPhone,
    guestEmail,
    staffNote,
    customTotal,
    bookingSource,
    bedSetup,
    depositPaid,
    paymentCollectedVia,
    showEmail,
    showTotal,
  } = fields;
  const sourceIsOta = isOtaBookingSource(bookingSource);

  function setField<Key extends keyof WalkInFields>(
    key: Key,
    value: WalkInFields[Key],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  // The Save button sits below the fields, so a rejected save has to pull
  // attention back up to the reason rather than leaving the desk guessing.
  useEffect(() => {
    if (state.status === "error") {
      errorRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (revealTarget.current === "email" && showEmail) {
      emailRef.current?.focus();
    }
    if (revealTarget.current === "total" && showTotal) {
      totalRef.current?.focus();
    }
    revealTarget.current = null;
  }, [showEmail, showTotal]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key === "Enter") {
        event.preventDefault();
        if (!canManage || pending) return;
        formRef.current?.requestSubmit();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!pending) onBack();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [canManage, onBack, pending]);

  const departureBounds = departureBoundsForArrival(arrival);

  /** Moving arrival carries the chosen night count with it. */
  function changeArrival(next: string) {
    setFields((current) => ({
      ...current,
      arrival: next,
      departure: alignDepartureToArrival(next, current.departure, current.arrival),
    }));
  }

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
  const errorId = displayError ? "walk-in-error" : undefined;
  const quoteId = quoteLabel ? "walk-in-quote" : undefined;
  const nameInvalid = state.error === "invalid-name";
  const emailInvalid = state.error === "invalid-email";
  const phoneInvalid = state.error === "invalid-phone";
  const datesInvalid =
    state.error === "invalid-dates" || state.error === "past-date";
  const totalInvalid = state.error === "invalid-custom-total";
  const bedInvalid = state.error === "invalid-bed";

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
      <p className="detail-help calendar-walk-in__hint">
        Tab through fields. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves ·{" "}
        <kbd>Esc</kbd> goes back.
        {roomUnitNumber
          ? ` Door #${roomUnitNumber} is assigned on save.`
          : " A free door is assigned on save."}
      </p>
      {displayError ? (
        <p
          className="form-message form-message--error"
          id={errorId}
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          {displayError}
        </p>
      ) : null}
      <form
        action={formAction}
        className="calendar-manage-form calendar-walk-in"
        ref={formRef}
      >
        <StaffFormBusyBridge />
        <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
        <input name="room-id" type="hidden" value={roomId} />
        {roomUnitId ? (
          <input name="room-unit-id" type="hidden" value={roomUnitId} />
        ) : null}
        {showEmail ? <input name="show-email" type="hidden" value="1" /> : null}
        {showTotal ? <input name="show-total" type="hidden" value="1" /> : null}

        <div className="calendar-ops-row">
          <div className="field-pair">
            <label htmlFor="walk-in-guest-name">Guest</label>
            <input
              aria-describedby={nameInvalid ? errorId : undefined}
              aria-invalid={nameInvalid || undefined}
              autoCapitalize="words"
              autoComplete="name"
              autoFocus
              disabled={!canManage || pending}
              id="walk-in-guest-name"
              maxLength={GUEST_NAME_MAX}
              minLength={2}
              name="guest-name"
              onChange={(event) => setField("guestName", event.target.value)}
              required
              type="text"
              value={guestName}
            />
          </div>
          <div className="field-pair">
            <label htmlFor="walk-in-guest-phone">Phone</label>
            <input
              aria-describedby={phoneInvalid ? errorId : undefined}
              aria-invalid={phoneInvalid || undefined}
              autoComplete="tel"
              disabled={!canManage || pending}
              id="walk-in-guest-phone"
              inputMode="tel"
              maxLength={30}
              name="guest-phone"
              onChange={(event) => setField("guestPhone", event.target.value)}
              type="tel"
              value={guestPhone}
            />
          </div>
        </div>

        <div className="calendar-ops-row">
          <div className="field-pair">
            <label htmlFor="walk-in-arrival">Arrival</label>
            <input
              aria-describedby={datesInvalid ? errorId : undefined}
              aria-invalid={datesInvalid || undefined}
              disabled={!canManage || pending}
              id="walk-in-arrival"
              name="arrival"
              onChange={(event) => changeArrival(event.target.value)}
              required
              type="date"
              value={arrival}
            />
          </div>
          <div className="field-pair">
            <label htmlFor="walk-in-departure">Departure</label>
            <input
              aria-describedby={
                [datesInvalid ? errorId : null, quoteId].filter(Boolean).join(" ") ||
                undefined
              }
              aria-invalid={datesInvalid || undefined}
              disabled={!canManage || pending}
              id="walk-in-departure"
              max={departureBounds?.max}
              min={departureBounds?.min}
              name="departure"
              onChange={(event) => setField("departure", event.target.value)}
              required
              type="date"
              value={departure}
            />
          </div>
        </div>

        {quoteLabel ? (
          <p className="detail-help" id={quoteId}>
            Usual rate: <strong>{quoteLabel}</strong>
            {quote.hasPromotion ? " (includes promo nights)" : ""}.
          </p>
        ) : null}

        <div className="calendar-ops-row">
          <div className="field-pair">
            <label htmlFor="walk-in-bed-setup">Bed</label>
            <select
              aria-describedby={bedInvalid ? errorId : undefined}
              aria-invalid={bedInvalid || undefined}
              disabled={!canManage || pending}
              id="walk-in-bed-setup"
              name="bed-setup"
              onChange={(event) =>
                setField(
                  "bedSetup",
                  bedCodeFromValue(event.target.value) || ("" as const),
                )
              }
              required
              value={bedSetup}
            >
              <option disabled value="">
                TWN or DBL
              </option>
              <option value="TWN">TWN — twin</option>
              <option value="DBL">DBL — double / king</option>
            </select>
          </div>
          <BookingSourceField
            disabled={!canManage || pending}
            id="walk-in-booking-source"
            onChange={(value) =>
              setFields((current) => ({
                ...current,
                bookingSource: value,
                paymentCollectedVia: isOtaBookingSource(value)
                  ? ""
                  : current.paymentCollectedVia,
              }))
            }
            value={bookingSource}
          />
        </div>

        <div className="calendar-ops-row calendar-ops-row--tools">
          {showEmail ? (
            <div className="field-pair">
              <label htmlFor="walk-in-guest-email">Email</label>
              <input
                aria-describedby={
                  [emailInvalid ? errorId : null, emailHelpId]
                    .filter(Boolean)
                    .join(" ")
                }
                aria-invalid={emailInvalid || undefined}
                autoComplete="email"
                disabled={!canManage || pending}
                id="walk-in-guest-email"
                name="guest-email"
                onChange={(event) => setField("guestEmail", event.target.value)}
                ref={emailRef}
                type="email"
                value={guestEmail}
              />
              <span className="field-help" id={emailHelpId}>
                Leave blank if none. Conversation opens after save.
              </span>
            </div>
          ) : (
            <div className="field-pair field-pair--wide">
              <button
                className="button button--quiet"
                disabled={!canManage || pending}
                onClick={() => {
                  revealTarget.current = "email";
                  setField("showEmail", true);
                }}
                type="button"
              >
                Add email
              </button>
            </div>
          )}

          {showTotal ? (
            <div className="field-pair">
              <label htmlFor="walk-in-custom-total">
                Stay total ({currency.toUpperCase()})
              </label>
              <input
                aria-describedby={
                  [totalInvalid ? errorId : null, totalHelpId]
                    .filter(Boolean)
                    .join(" ")
                }
                aria-invalid={totalInvalid || undefined}
                disabled={!canManage || pending}
                id="walk-in-custom-total"
                inputMode="decimal"
                min={0}
                name="custom-total"
                onChange={(event) => setField("customTotal", event.target.value)}
                placeholder={quote.nights > 0 ? String(quote.total) : undefined}
                ref={totalRef}
                step="any"
                type="number"
                value={customTotal}
              />
              <span className="field-help" id={totalHelpId}>
                Blank uses usual rate
                {quoteLabel ? ` (${quoteLabel})` : ""}.
              </span>
            </div>
          ) : (
            <div className="field-pair field-pair--wide">
              <button
                className="button button--quiet"
                disabled={!canManage || pending}
                onClick={() => {
                  revealTarget.current = "total";
                  setField("showTotal", true);
                }}
                type="button"
              >
                Adjust stay total
              </button>
            </div>
          )}
        </div>

        <div className="field-pair field-pair--check">
          <label htmlFor="walk-in-deposit-paid">
            <input
              checked={depositPaid}
              disabled={!canManage || pending}
              id="walk-in-deposit-paid"
              name="deposit-paid"
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  depositPaid: event.target.checked,
                  paymentCollectedVia: event.target.checked
                    ? current.paymentCollectedVia
                    : "",
                }))
              }
              type="checkbox"
              value="1"
            />
            Paid
          </label>
          {depositPaid && sourceIsOta ? (
            <span className="field-help">
              {formatBookingSource(bookingSource)} stays are always card —
              no Cash / Thai bank needed.
            </span>
          ) : depositPaid ? (
            <fieldset className="payment-collected-via">
              <legend className="sr-only">How was payment collected?</legend>
              <label>
                <input
                  checked={paymentCollectedVia === "cash"}
                  disabled={!canManage || pending}
                  name="payment-collected-via"
                  onChange={() => setField("paymentCollectedVia", "cash")}
                  required
                  type="radio"
                  value="cash"
                />
                Cash
              </label>
              <label>
                <input
                  checked={paymentCollectedVia === "thai_bank"}
                  disabled={!canManage || pending}
                  name="payment-collected-via"
                  onChange={() => setField("paymentCollectedVia", "thai_bank")}
                  required
                  type="radio"
                  value="thai_bank"
                />
                Thai bank
              </label>
            </fieldset>
          ) : (
            <span className="field-help">
              Unchecked holds the room unpaid. When Paid, choose Cash or Thai bank.
            </span>
          )}
        </div>

        <div className="field-pair field-pair--wide">
          <label htmlFor="walk-in-note">Note</label>
          <textarea
            disabled={!canManage || pending}
            id="walk-in-note"
            name="staff-note"
            onChange={(event) => setField("staffNote", event.target.value)}
            placeholder="Arrival, payment, or desk reminders."
            rows={2}
            value={staffNote}
          />
        </div>
        <div className="calendar-day-panel__actions">
          <button
            className="button button--quiet"
            disabled={pending}
            onClick={onBack}
            type="button"
          >
            Back
          </button>
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
