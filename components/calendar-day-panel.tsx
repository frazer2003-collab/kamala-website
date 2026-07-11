"use client";

import Link from "next/link";
import { useMemo } from "react";
import { createRoomBlock, createWalkInBooking, updateRoomDayAllotment } from "@/app/actions";
import { getTodayIso } from "@/lib/calendar";
import type { Room } from "@/lib/content";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";

type DayStayLink = {
  key: string;
  href: string;
  label: string;
  sublabel: string;
};

type CalendarDayPanelProps = {
  room: Room;
  date: string;
  monthKey: string;
  mode?: string;
  canManage: boolean;
  error?: string;
  overlap?: string;
  currentAllotment: number;
  hasAllotmentOverride: boolean;
  dayStays?: DayStayLink[];
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
    return "Walk-ins, closures, and allotment changes can only start from today onward.";
  }

  if (error === "invalid-name") {
    return "Enter the guest name before saving the walk-in.";
  }

  if (error === "invalid-phone") {
    return "Enter a valid phone number with at least 7 digits.";
  }

  if (error === "invalid-dates") {
    return "Choose a valid date range.";
  }

  if (error === "invalid-allotment") {
    return "Enter how many rooms to sell (0 or more).";
  }

  if (error === "save-failed") {
    return "Could not save the allotment. Try again, or ask whoever set up the site if the problem continues.";
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
  currentAllotment,
  hasAllotmentOverride,
  dayStays = [],
}: CalendarDayPanelProps) {
  const defaultDeparture = useMemo(() => addIsoDays(date, 1), [date]);
  const todayIso = useMemo(() => getTodayIso(), []);
  const dayHref = `/staff/calendar?month=${monthKey}&room=${encodeURIComponent(room.id)}&date=${encodeURIComponent(date)}`;
  const errorMessage = getErrorMessage(error, overlap);

  if (mode === "stays") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Stays on {formatDisplayDate(date)} · <strong>{room.name}</strong>
        </p>
        {dayStays.length === 0 ? (
          <p className="detail-help">No stays overlap this night.</p>
        ) : (
          <div className="calendar-day-panel__choices">
            {dayStays.map((stay) => (
              <Link className="calendar-day-choice" href={stay.href} key={stay.key}>
                <strong>{stay.label}</strong>
                <span>{stay.sublabel}</span>
              </Link>
            ))}
          </div>
        )}
        <p className="detail-help">
          <Link href={dayHref}>Back to day actions</Link>
        </p>
      </>
    );
  }

  if (mode === "allotment") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Temporarily change rooms to sell for <strong>{room.name}</strong>. The
          default in room settings stays <strong>{room.availableCount}</strong>.
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={updateRoomDayAllotment} className="calendar-manage-form">
          <input name="month" type="hidden" value={monthKey} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="allotment-start-date">First night</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="allotment-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="allotment-end-date">Last night</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="allotment-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
            <span className="field-help">Both nights are included.</span>
          </div>
          <div className="field-pair">
            <label htmlFor="allotment-rooms-to-sell">Rooms to sell</label>
            <input
              defaultValue={currentAllotment}
              disabled={!canManage}
              id="allotment-rooms-to-sell"
              max={room.availableCount}
              min={0}
              name="rooms-to-sell"
              type="number"
            />
            <span className="field-help">
              Max {room.availableCount}. Use 0 to stop selling without closing the
              type.
              {hasAllotmentOverride
                ? ` Tonight’s override is ${currentAllotment}.`
                : " Tonight uses the room default."}
            </span>
          </div>
          <div className="calendar-day-panel__actions">
            <Link className="button button--quiet" href={dayHref}>
              Back
            </Link>
            <div className="calendar-day-panel__actions-end">
              <button
                className="button button--quiet"
                disabled={!canManage}
                name="allotment-action"
                title={`Clear temporary overrides for the selected nights and restore ${room.availableCount}`}
                type="submit"
                value="reset"
              >
                Reset selected dates
              </button>
              <button
                className="button button--primary"
                disabled={!canManage}
                name="allotment-action"
                type="submit"
                value="set"
              >
                Save temporary allotment
              </button>
            </div>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">
            Day allotments aren’t available until the site connection is set up.
          </p>
        ) : null}
      </>
    );
  }

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

  if (mode === "block") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Close nights for <strong>{room.name}</strong> starting{" "}
          {formatDisplayDate(date)}.
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
            Connect the site to save room closures from the calendar.
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
        <Link className="calendar-day-choice" href={`${dayHref}&mode=allotment`}>
          <strong>Change allotment</strong>
          <span>
            Still for sale — limit how many rooms to sell tonight. Room settings
            default stays {room.availableCount}
            {hasAllotmentOverride ? ` · override is ${currentAllotment}` : ""}.
          </span>
        </Link>
        <Link className="calendar-day-choice" href={`${dayHref}&mode=block`}>
          <strong>Close dates</strong>
          <span>
            Not for sale — mark nights closed in the status row (not as a
            reservation).
          </span>
        </Link>
        <Link className="calendar-day-choice" href={`${dayHref}&mode=walk-in`}>
          <strong>Walk-in booking</strong>
          <span>Add a confirmed stay directly from the front desk.</span>
        </Link>
      </div>
      <p className="detail-help">
        Prefer <strong>Close</strong> when the room type should not sell.
        Prefer <strong>Allotment</strong> when it stays open but you need a
        temporary count. Sold out means bookings already filled inventory.
      </p>
    </>
  );
}
