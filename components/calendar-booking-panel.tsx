"use client";

import { useEffect, useMemo, useState } from "react";
import { cancelConfirmedBooking, updateConfirmedBooking } from "@/app/actions";
import type { StayStatus } from "@/lib/content";

const WALK_IN_EMAIL_PLACEHOLDER = "walk-in@kamala.local";

type CalendarBookingPanelProps = {
  bookingKey: string;
  databaseId: string;
  monthKey: string;
  canManage: boolean;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  arrivalDate: string;
  departureDate: string;
  stayStatus: StayStatus;
  note: string;
  staffNote: string;
};

export function CalendarBookingPanel({
  bookingKey,
  databaseId,
  monthKey,
  canManage,
  guestName,
  guestEmail,
  guestPhone,
  arrivalDate,
  departureDate,
  stayStatus,
  note,
  staffNote,
}: CalendarBookingPanelProps) {
  const initialEmail = guestEmail === WALK_IN_EMAIL_PLACEHOLDER ? "" : guestEmail;
  const [fields, setFields] = useState({
    guestName,
    guestEmail: initialEmail,
    guestPhone,
    arrivalDate,
    departureDate,
    stayStatus,
    staffNote,
  });

  useEffect(() => {
    setFields({
      guestName,
      guestEmail: guestEmail === WALK_IN_EMAIL_PLACEHOLDER ? "" : guestEmail,
      guestPhone,
      arrivalDate,
      departureDate,
      stayStatus,
      staffNote,
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
  ]);

  const saveAction = useMemo(
    () => updateConfirmedBooking.bind(null, databaseId),
    [databaseId],
  );

  const cancelAction = useMemo(
    () => cancelConfirmedBooking.bind(null, databaseId, monthKey),
    [databaseId, monthKey],
  );

  return (
    <>
      <form action={saveAction} className="calendar-manage-form">
        <input name="month" type="hidden" value={monthKey} />
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

      <form action={cancelAction} className="detail-actions">
        <button className="button button--secondary" disabled={!canManage} type="submit">
          Cancel stay
        </button>
      </form>
    </>
  );
}
