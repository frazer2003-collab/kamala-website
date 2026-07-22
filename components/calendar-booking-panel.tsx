"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  cancelConfirmedBooking,
  updateConfirmedBooking,
  type UpdateConfirmedBookingState,
} from "@/app/actions";
import type { StayStatus } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import { formatMoneySuffix } from "@/lib/currency";
import {
  OVERBOOK_SAVE_ANYWAY_HINT,
  staffCapacityErrorMessage,
} from "@/lib/booking-overbook";
import {
  calculateStayQuote,
  type RoomPromotionRate,
} from "@/lib/pricing";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";
import { getAssignableUnitsForStay, getRoomUnitById } from "@/lib/room-units";

const WALK_IN_EMAIL_PLACEHOLDER = "walk-in@kamala.local";

const idleUpdateState: UpdateConfirmedBookingState = { status: "idle" };

type CalendarBookingPanelProps = {
  bookingKey: string;
  databaseId: string;
  monthKey: string;
  canManage: boolean;
  /** Confirmed stays only — awaiting reservations are declined from the inbox. */
  canCancelStay?: boolean;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  arrivalDate: string;
  departureDate: string;
  stayStatus: StayStatus;
  note: string;
  staffNote: string;
  roomId: string;
  rooms: Array<{ id: string; name: string; rate: number }>;
  roomUnitId: string | null;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  depositPaid: boolean;
  estimatedTotal: number;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  formError?: string | null;
};

function formatStayDates(arrival: string, departure: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
  const start = formatter.format(new Date(`${arrival}T00:00:00`));
  const end = formatter.format(new Date(`${departure}T00:00:00`));
  return `${start} – ${end}`;
}

export function CalendarBookingPanel({
  bookingKey,
  databaseId,
  monthKey,
  canManage,
  canCancelStay = true,
  guestName,
  guestEmail,
  guestPhone,
  arrivalDate,
  departureDate,
  stayStatus,
  note,
  staffNote,
  roomId,
  rooms,
  roomUnitId,
  roomUnits,
  occupancies,
  depositPaid,
  estimatedTotal,
  currency,
  promotions,
  rateOverrides,
  formError,
}: CalendarBookingPanelProps) {
  const initialEmail = guestEmail === WALK_IN_EMAIL_PLACEHOLDER ? "" : guestEmail;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [fields, setFields] = useState({
    guestName,
    guestEmail: initialEmail,
    guestPhone,
    arrivalDate,
    departureDate,
    stayStatus,
    staffNote,
    roomId,
    roomUnitId: roomUnitId ?? "",
    estimatedTotal: String(estimatedTotal),
  });

  useEffect(() => {
    setConfirmCancel(false);
    setFields({
      guestName,
      guestEmail: guestEmail === WALK_IN_EMAIL_PLACEHOLDER ? "" : guestEmail,
      guestPhone,
      arrivalDate,
      departureDate,
      stayStatus,
      staffNote,
      roomId,
      roomUnitId: roomUnitId ?? "",
      estimatedTotal: String(estimatedTotal),
    });
  }, [
    bookingKey,
    guestName,
    guestEmail,
    guestPhone,
    arrivalDate,
    departureDate,
    stayStatus,
    staffNote,
    roomId,
    roomUnitId,
    estimatedTotal,
  ]);

  const saveAction = useMemo(
    () => updateConfirmedBooking.bind(null, databaseId),
    [databaseId],
  );
  const [saveState, formAction, savePending] = useActionState(
    saveAction,
    idleUpdateState,
  );

  const cancelAction = useMemo(
    () => cancelConfirmedBooking.bind(null, databaseId, monthKey),
    [databaseId, monthKey],
  );

  const assignableUnits = useMemo(() => {
    const free = getAssignableUnitsForStay({
      units: roomUnits,
      roomId: fields.roomId,
      arrivalDate: fields.arrivalDate,
      departureDate: fields.departureDate,
      excludeId: databaseId || undefined,
      occupancies,
    });
    const current = getRoomUnitById(roomUnits, fields.roomUnitId);
    if (current && !free.some((unit) => unit.id === current.id)) {
      return [current, ...free];
    }
    return free;
  }, [
    databaseId,
    fields.arrivalDate,
    fields.departureDate,
    fields.roomId,
    fields.roomUnitId,
    occupancies,
    roomUnits,
  ]);

  const selectedRoom = rooms.find((room) => room.id === fields.roomId);
  const quote = useMemo(() => {
    if (!selectedRoom) {
      return null;
    }
    return calculateStayQuote({
      roomId: selectedRoom.id,
      baseRate: selectedRoom.rate,
      arrival: fields.arrivalDate,
      departure: fields.departureDate,
      promotions,
      rateOverrides: new Map(Object.entries(rateOverrides)),
    });
  }, [
    fields.arrivalDate,
    fields.departureDate,
    promotions,
    rateOverrides,
    selectedRoom,
  ]);

  const quoteLabel =
    quote && quote.nights > 0
      ? `${formatMoneySuffix(quote.total, currency)} · ${quote.nights} night${quote.nights === 1 ? "" : "s"}`
      : null;

  const stayTotalHelpId = `calendar-stay-total-help-${bookingKey}`;
  const emailHelpId = `calendar-guest-email-help-${bookingKey}`;
  const actionError =
    saveState.status === "error" || saveState.status === "overbook"
      ? staffCapacityErrorMessage(saveState.error)
      : null;
  const displayError = actionError || formError;
  const needsOverbookConfirm = saveState.status === "overbook";
  const formErrorId = displayError
    ? `calendar-booking-error-${bookingKey}`
    : undefined;

  return (
    <>
      {displayError ? (
        <p className="form-message form-message--error" id={formErrorId} role="alert">
          {displayError}
          {needsOverbookConfirm ? OVERBOOK_SAVE_ANYWAY_HINT : null}
        </p>
      ) : null}
      <form action={formAction} className="calendar-manage-form">
        <StaffFormBusyBridge />
        <input name="month" type="hidden" value={monthKey} />
        {needsOverbookConfirm ? (
          <input name="overbook-confirm" type="hidden" value="1" />
        ) : null}
        <div className="field-pair">
          <label htmlFor={`calendar-stay-status-${bookingKey}`}>Check-in status</label>
          <select
            disabled={!canManage || savePending}
            id={`calendar-stay-status-${bookingKey}`}
            name="stay-status"
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                stayStatus: event.target.value as StayStatus,
              }))
            }
            value={fields.stayStatus}
          >
            <option value="expected">Expected</option>
            <option value="checked-in">Checked in</option>
            <option value="checked-out">Checked out</option>
          </select>
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-room-type-${bookingKey}`}>Room type</label>
          <select
            disabled={!canManage}
            id={`calendar-room-type-${bookingKey}`}
            name="room-id"
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                roomId: event.target.value,
                roomUnitId: "",
              }))
            }
            value={fields.roomId}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <span className="field-help">
            Room number clears when the type changes. Stay total stays as entered
            unless you change or clear it.
          </span>
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-room-unit-${bookingKey}`}>Room number</label>
          <select
            disabled={!canManage}
            id={`calendar-room-unit-${bookingKey}`}
            name="room-unit-id"
            onChange={(event) =>
              setFields((current) => ({ ...current, roomUnitId: event.target.value }))
            }
            value={fields.roomUnitId}
          >
            <option value="">Not assigned yet</option>
            {assignableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.number}
                {unit.roomIds.length > 1 ? " (shared)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-arrival-${bookingKey}`}>Arrival</label>
          <input
            disabled={!canManage}
            id={`calendar-arrival-${bookingKey}`}
            name="arrival"
            onChange={(event) =>
              setFields((current) => ({ ...current, arrivalDate: event.target.value }))
            }
            required
            type="date"
            value={fields.arrivalDate}
          />
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-departure-${bookingKey}`}>Departure</label>
          <input
            disabled={!canManage}
            id={`calendar-departure-${bookingKey}`}
            name="departure"
            onChange={(event) =>
              setFields((current) => ({ ...current, departureDate: event.target.value }))
            }
            required
            type="date"
            value={fields.departureDate}
          />
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-stay-total-${bookingKey}`}>
            Stay total ({currency.toUpperCase()})
          </label>
          <input
            aria-describedby={[stayTotalHelpId, formErrorId].filter(Boolean).join(" ") || undefined}
            disabled={!canManage}
            id={`calendar-stay-total-${bookingKey}`}
            inputMode="numeric"
            min={0}
            name="custom-total"
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                estimatedTotal: event.target.value,
              }))
            }
            placeholder={quote ? String(quote.total) : undefined}
            step={1}
            type="number"
            value={fields.estimatedTotal}
          />
          <span className="field-help" id={stayTotalHelpId}>
            {quoteLabel ? (
              <>
                Usual rate for these dates: <strong>{quoteLabel}</strong>.{" "}
              </>
            ) : null}
            Leave blank to use that usual rate. Changing dates does not change the
            saved total unless you edit or clear this field.
          </span>
          {canManage && quote && quote.nights > 0 ? (
            <button
              className="button button--quiet"
              onClick={() =>
                setFields((current) => ({
                  ...current,
                  estimatedTotal: String(quote.total),
                }))
              }
              type="button"
            >
              Use usual rate
            </button>
          ) : null}
        </div>
        <div className="field-pair field-pair--wide">
          <label htmlFor={`calendar-guest-name-${bookingKey}`}>Guest name</label>
          <input
            autoComplete="name"
            disabled={!canManage}
            id={`calendar-guest-name-${bookingKey}`}
            name="guest-name"
            onChange={(event) =>
              setFields((current) => ({ ...current, guestName: event.target.value }))
            }
            required
            type="text"
            value={fields.guestName}
          />
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-guest-phone-${bookingKey}`}>Phone number (optional)</label>
          <input
            autoComplete="tel"
            disabled={!canManage}
            id={`calendar-guest-phone-${bookingKey}`}
            inputMode="tel"
            name="guest-phone"
            onChange={(event) =>
              setFields((current) => ({ ...current, guestPhone: event.target.value }))
            }
            type="tel"
            value={fields.guestPhone}
          />
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-guest-email-${bookingKey}`}>Email (optional)</label>
          <input
            aria-describedby={emailHelpId}
            autoComplete="email"
            disabled={!canManage}
            id={`calendar-guest-email-${bookingKey}`}
            name="guest-email"
            onChange={(event) =>
              setFields((current) => ({ ...current, guestEmail: event.target.value }))
            }
            type="email"
            value={fields.guestEmail}
          />
          <span className="field-help" id={emailHelpId}>
            Leave blank if the guest has no email.
          </span>
        </div>
        <div className="field-pair field-pair--wide guest-note">
          <span>Guest note</span>
          <p>{note || "No guest note added."}</p>
        </div>
        <div className="field-pair field-pair--wide">
          <label htmlFor={`calendar-staff-note-${bookingKey}`}>Staff note</label>
          <textarea
            disabled={!canManage}
            id={`calendar-staff-note-${bookingKey}`}
            name="staff-note"
            onChange={(event) =>
              setFields((current) => ({ ...current, staffNote: event.target.value }))
            }
            placeholder="Arrival instructions, payment notes, or internal reminders."
            rows={3}
            value={fields.staffNote}
          />
        </div>
        <button
          className="button button--primary"
          disabled={!canManage || savePending}
          type="submit"
        >
          {needsOverbookConfirm
            ? savePending
              ? "Saving…"
              : "Save anyway"
            : savePending
              ? "Saving…"
              : "Save changes"}
        </button>
      </form>

      {canCancelStay ? (
        confirmCancel ? (
          <div className="calendar-cancel-confirm">
            <p className="calendar-cancel-confirm__summary">
              Cancel <strong>{fields.guestName || guestName}</strong> for{" "}
              <strong>
                {formatStayDates(
                  fields.arrivalDate || arrivalDate,
                  fields.departureDate || departureDate,
                )}
              </strong>
              ? This removes the stay from the calendar
              {depositPaid ? " and releases inventory held by the payment" : ""}.
            </p>
            <div className="calendar-cancel-confirm__actions">
              <form action={cancelAction}>
                <StaffFormBusyBridge />
                <button className="button button--danger" disabled={!canManage} type="submit">
                  Yes, cancel stay
                </button>
              </form>
              <button
                className="button button--secondary"
                disabled={!canManage}
                onClick={() => setConfirmCancel(false)}
                type="button"
              >
                Keep stay
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-actions">
            <button
              className="button button--secondary"
              disabled={!canManage}
              onClick={() => setConfirmCancel(true)}
              type="button"
            >
              Cancel stay
            </button>
          </div>
        )
      ) : null}
    </>
  );
}
