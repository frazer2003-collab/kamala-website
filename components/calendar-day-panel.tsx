"use client";

import Link from "next/link";
import { useMemo } from "react";
import { createRoomBlock, createWalkInBooking } from "@/app/actions";
import { getTodayIso } from "@/lib/calendar";
import type { Room } from "@/lib/content";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";

type CalendarDayPanelProps = {
  room: Room;
  date: string;
  monthKey: string;
  mode?: string;
  canManage: boolean;
  error?: string;
  overlap?: string;
};

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function getErrorMessage(error?: string, overlap?: string) {
  if (error === "overlap") {
    return formatOverlapErrorMessage(parseOverlapDays(overlap));
  }

  if (error === "past-date") {
    return "Walk-ins and closures can only be added from today onward.";
  }

  if (error === "invalid-name") {
    return "Enter the guest name before saving the walk-in.";
  }

  if (error === "invalid-phone") {
    return "Enter a valid phone number with at least 7 digits.";
  }

  if (error === "invalid-dates") {
    return "Choose a stay between 1 and 21 nights.";
  }

  if (error === "save-failed") {
    return "Could not save. Run supabase/migrate-room-blocks.sql if this is a new install.";
  }

  return null;
}

export function CalendarDayPanel({
  room,
  date,
  monthKey,
  mode,
  canManage,
  error,
  overlap,
}: CalendarDayPanelProps) {
  const defaultDeparture = useMemo(() => addIsoDays(date, 1), [date]);
  const todayIso = useMemo(() => getTodayIso(), []);
  const dayHref = `/staff/calendar?month=${monthKey}&room=${encodeURIComponent(room.id)}&date=${encodeURIComponent(date)}`;
  const errorMessage = getErrorMessage(error, overlap);

  if (mode === "walk-in") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Add a confirmed walk-in for <strong>{room.name}</strong>, starting{" "}
          {formatDisplayDate(date)}.
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={createWalkInBooking} className="calendar-manage-form">
          <input name="month" type="hidden" value={monthKey} />
          <input name="room-id" type="hidden" value={room.id} />
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
            <label htmlFor="walk-in-guest-phone">Phone number</label>
            <input
              autoComplete="tel"
              disabled={!canManage}
              id="walk-in-guest-phone"
              inputMode="tel"
              name="guest-phone"
              required
              type="tel"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="walk-in-guest-email">Email (optional)</label>
            <input
              autoComplete="email"
              disabled={!canManage}
              id="walk-in-guest-email"
              name="guest-email"
              placeholder="Leave blank for walk-in placeholder"
              type="email"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="walk-in-arrival">Arrival</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="walk-in-arrival"
              min={todayIso}
              name="arrival"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="walk-in-departure">Departure</label>
            <input
              defaultValue={defaultDeparture}
              disabled={!canManage}
              id="walk-in-departure"
              min={todayIso}
              name="departure"
              required
              type="date"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor="walk-in-staff-note">Staff note</label>
            <textarea
              disabled={!canManage}
              id="walk-in-staff-note"
              name="staff-note"
              placeholder="Payment taken, arrival time, or room instructions."
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
            Connect Supabase to save walk-in bookings from the calendar.
          </p>
        ) : null}
      </>
    );
  }

  if (mode === "block") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Close <strong>{room.name}</strong> from {formatDisplayDate(date)} onward.
          Departure is the first date the room becomes available again.
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={createRoomBlock} className="calendar-manage-form">
          <input name="month" type="hidden" value={monthKey} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="block-start-date">Closed from</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="block-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="block-end-date">Available again from</label>
            <input
              defaultValue={defaultDeparture}
              disabled={!canManage}
              id="block-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="block-reason">Reason</label>
            <input
              defaultValue="Closed"
              disabled={!canManage}
              id="block-reason"
              name="reason"
              placeholder="Maintenance, hold, or private use"
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor="block-staff-note">Staff note</label>
            <textarea
              disabled={!canManage}
              id="block-staff-note"
              name="staff-note"
              placeholder="Anything the front desk should remember."
              rows={3}
            />
          </div>
          <div className="calendar-day-panel__actions">
            <Link className="button button--quiet" href={dayHref}>
              Back
            </Link>
            <button className="button button--primary" disabled={!canManage} type="submit">
              Close dates
            </button>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">
            Connect Supabase to save room closures from the calendar.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="calendar-day-panel__intro">
        {formatDisplayDate(date)} · <strong>{room.name}</strong>
      </p>
      <div className="calendar-day-panel__choices">
        <Link
          className="calendar-day-choice"
          href={`${dayHref}&mode=block`}
        >
          <strong>Close dates</strong>
          <span>
            Mark nights as closed. They appear in the status row — not as
            reservations.
          </span>
        </Link>
        <Link
          className="calendar-day-choice"
          href={`${dayHref}&mode=walk-in`}
        >
          <strong>Walk-in booking</strong>
          <span>Add a confirmed stay directly from the front desk.</span>
        </Link>
      </div>
      <p className="detail-help">
        Closed nights show as red status pills with shaded columns on the
        calendar. Guest reservations stay in the reservations row.
      </p>
    </>
  );
}
