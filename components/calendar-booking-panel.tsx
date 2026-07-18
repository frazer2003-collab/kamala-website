"use client";

import { useEffect, useMemo, useState } from "react";
import { cancelConfirmedBooking, updateConfirmedBooking } from "@/app/actions";
import type { StayStatus } from "@/lib/content";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";
import { getAssignableUnitsForStay, getRoomUnitById } from "@/lib/room-units";

const WALK_IN_EMAIL_PLACEHOLDER = "walk-in@kamala.local";

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
  roomUnitId: string | null;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  depositPaid: boolean;
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
  roomUnitId,
  roomUnits,
  occupancies,
  depositPaid,
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
    roomUnitId: roomUnitId ?? "",
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
      roomUnitId: roomUnitId ?? "",
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
    roomUnitId,
  ]);

  const saveAction = useMemo(
    () => updateConfirmedBooking.bind(null, databaseId),
    [databaseId],
  );

  const cancelAction = useMemo(
    () => cancelConfirmedBooking.bind(null, databaseId, monthKey),
    [databaseId, monthKey],
  );

  const assignableUnits = useMemo(() => {
    const free = getAssignableUnitsForStay({
      units: roomUnits,
      roomId,
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
    fields.roomUnitId,
    occupancies,
    roomId,
    roomUnits,
  ]);

  return (
    <>
      {formError ? (
        <p className="form-message form-message--error" role="alert">
          {formError}
        </p>
      ) : null}
      <form action={saveAction} className="calendar-manage-form">
        <input name="month" type="hidden" value={monthKey} />
        <div className="field-pair">
          <label htmlFor={`calendar-stay-status-${bookingKey}`}>Check-in status</label>
          <select
            disabled={!canManage}
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
          <label htmlFor={`calendar-guest-phone-${bookingKey}`}>Phone number</label>
          <input
            autoComplete="tel"
            disabled={!canManage}
            id={`calendar-guest-phone-${bookingKey}`}
            inputMode="tel"
            name="guest-phone"
            onChange={(event) =>
              setFields((current) => ({ ...current, guestPhone: event.target.value }))
            }
            required
            type="tel"
            value={fields.guestPhone}
          />
        </div>
        <div className="field-pair">
          <label htmlFor={`calendar-guest-email-${bookingKey}`}>Email (optional)</label>
          <input
            autoComplete="email"
            disabled={!canManage}
            id={`calendar-guest-email-${bookingKey}`}
            name="guest-email"
            onChange={(event) =>
              setFields((current) => ({ ...current, guestEmail: event.target.value }))
            }
            placeholder="Leave blank for walk-in placeholder"
            type="email"
            value={fields.guestEmail}
          />
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
        <button className="button button--primary" disabled={!canManage} type="submit">
          Save changes
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
