"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import Link from "next/link";
import { useMemo } from "react";
import {
  createRoomBlock,
  updateRoomDayAllotment,
  updateRoomDayRate,
} from "@/app/actions";
import { CalendarRangeFields } from "@/components/calendar-range-fields";
import { CalendarWalkInForm } from "@/components/calendar-walk-in-form";
import { buildStaffCalendarHref, getTodayIso } from "@/lib/calendar";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import type { RoomPromotionRate } from "@/lib/pricing";
import {
  formatOverlapErrorMessage,
  parseOverlapDays,
} from "@/lib/stay-overlap";
import { staffCapacityErrorMessage } from "@/lib/booking-overbook";

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
  fromIso?: string;
  toIso?: string;
  mode?: string;
  canManage: boolean;
  error?: string;
  overlap?: string;
  currentAllotment: number;
  hasAllotmentOverride: boolean;
  currentRate: number;
  hasRateOverride: boolean;
  currency: PropertyCurrency;
  promotions: RoomPromotionRate[];
  rateOverrides: Record<string, number>;
  dayStays?: DayStayLink[];
  /** True when inventory row shows this night is full for the room type. */
  soldOutForNight?: boolean;
  /** Plain-language reason when the type night is not bookable. */
  soldOutReason?: string | null;
  /** Door clicked on the timeline — assign on Book. */
  roomUnitId?: string | null;
  roomUnitNumber?: string | null;
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
    return "Start from today.";
  }

  if (error === "invalid-name") {
    return "Enter guest name.";
  }

  if (error === "invalid-phone") {
    return "Phone needs 7+ digits, or leave blank.";
  }

  if (error === "invalid-email") {
    return "Enter a valid email, or leave blank.";
  }

  if (error === "invalid-dates") {
    return "Pick a valid date range.";
  }

  if (error === "invalid-allotment") {
    return "Rooms to sell must be 0 or more.";
  }

  if (error === "invalid-rate") {
    return "Rate must be 0 or more.";
  }

  if (error === "invalid-custom-total") {
    return "Stay total must be 0 or more, or leave blank.";
  }

  if (error === "overbook" || error === "unavailable" || error === "no-assignable-door" || error === "capacity-verify-failed") {
    return staffCapacityErrorMessage(error);
  }

  if (error === "invalid-room-number") {
    return "That door number is not available for this room type.";
  }

  if (error === "room-number-taken") {
    return "That door is already taken for these dates.";
  }

  if (error === "save-failed") {
    return "Could not save. Try again.";
  }

  return null;
}

export function CalendarDayPanel({
  room,
  date,
  monthKey,
  fromIso,
  toIso,
  mode,
  canManage,
  error,
  overlap,
  currentAllotment,
  hasAllotmentOverride,
  currentRate,
  hasRateOverride,
  currency,
  promotions,
  rateOverrides,
  dayStays = [],
  soldOutForNight = false,
  soldOutReason = null,
  roomUnitId = null,
  roomUnitNumber = null,
}: CalendarDayPanelProps) {
  const defaultDeparture = useMemo(() => addIsoDays(date, 1), [date]);
  const todayIso = useMemo(() => getTodayIso(), []);
  const dayHref = buildStaffCalendarHref({
    month: monthKey,
    from: fromIso,
    to: toIso,
    room: room.id,
    date,
    unit: roomUnitId ?? undefined,
  });
  const errorMessage = getErrorMessage(error, overlap);
  const fullStatus = (
    <p className="detail-help" role="status">
      Full for <strong>{room.name}</strong>.
      {soldOutReason ? (
        <>
          {" "}
          {soldOutReason}
        </>
      ) : null}
    </p>
  );

  if (mode === "stays") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          {formatDisplayDate(date)} · <strong>{room.name}</strong>
        </p>
        {dayStays.length === 0 ? (
          <p className="detail-help">No stays.</p>
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
        <div className="calendar-day-panel__choices">
          {soldOutForNight ? (
            fullStatus
          ) : (
            <Link className="calendar-day-choice" href={`${dayHref}&mode=walk-in`}>
              <strong>Book</strong>
              <span>Walk-in or OTA stay</span>
            </Link>
          )}
        </div>
        <p className="detail-help">
          <Link href={dayHref}>Back</Link>
        </p>
      </>
    );
  }

  if (mode === "allotment") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Allotment · <strong>{room.name}</strong> · default{" "}
          <strong>{room.availableCount}</strong>
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={updateRoomDayAllotment} className="calendar-manage-form">
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="allotment-start-date">From</label>
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
            <label htmlFor="allotment-end-date">To</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="allotment-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
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
              Max {room.availableCount}. 0 = stop selling.
              {hasAllotmentOverride ? ` Now ${currentAllotment}.` : ""}
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
                title={`Reset to ${room.availableCount}`}
                type="submit"
                value="reset"
              >
                Reset
              </button>
              <button
                className="button button--primary"
                disabled={!canManage}
                name="allotment-action"
                type="submit"
                value="set"
              >
                Save
              </button>
            </div>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to edit allotment.</p>
        ) : null}
      </>
    );
  }

  if (mode === "rate") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Rate · <strong>{room.name}</strong> · default <strong>{room.rate}</strong>
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={updateRoomDayRate} className="calendar-manage-form">
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="rate-start-date">From</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="rate-start-date"
              min={todayIso}
              name="start-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="rate-end-date">To</label>
            <input
              defaultValue={date}
              disabled={!canManage}
              id="rate-end-date"
              min={todayIso}
              name="end-date"
              required
              type="date"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="rate-nightly-rate">Nightly rate</label>
            <input
              defaultValue={currentRate}
              disabled={!canManage}
              id="rate-nightly-rate"
              inputMode="decimal"
              min={0}
              name="nightly-rate"
              required
              step="any"
              type="number"
            />
            <span className="field-help">
              Default {room.rate}.
              {hasRateOverride ? ` Now ${currentRate}.` : ""}
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
                name="rate-action"
                title={`Reset to ${room.rate}`}
                type="submit"
                value="reset"
              >
                Reset
              </button>
              <button
                className="button button--primary"
                disabled={!canManage}
                name="rate-action"
                type="submit"
                value="set"
              >
                Save
              </button>
            </div>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to edit rates.</p>
        ) : null}
      </>
    );
  }

  if (mode === "walk-in") {
    return (
      <CalendarWalkInForm
        canManage={canManage}
        currency={currency}
        date={date}
        dayHref={dayHref}
        errorMessage={errorMessage}
        fromIso={fromIso}
        monthKey={monthKey}
        promotions={promotions}
        rateOverrides={rateOverrides}
        roomId={room.id}
        roomName={room.name}
        roomRate={room.rate}
        roomUnitId={roomUnitId}
        roomUnitNumber={roomUnitNumber}
        toIso={toIso}
      />
    );
  }

  if (mode === "block") {
    return (
      <>
        <p className="calendar-day-panel__intro">
          Close · <strong>{room.name}</strong> · {formatDisplayDate(date)}
        </p>
        {errorMessage ? (
          <p className="form-message form-message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={createRoomBlock} className="calendar-manage-form">
          <StaffFormBusyBridge />
          <CalendarRangeFields fromIso={fromIso} monthKey={monthKey} toIso={toIso} />
          <input name="room-id" type="hidden" value={room.id} />
          <div className="field-pair">
            <label htmlFor="block-start-date">From</label>
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
            <label htmlFor="block-end-date">Open again</label>
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
              placeholder="Maintenance, hold…"
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor="block-staff-note">Note</label>
            <textarea
              disabled={!canManage}
              id="block-staff-note"
              name="staff-note"
              placeholder="Front desk note"
              rows={3}
            />
          </div>
          <div className="calendar-day-panel__actions">
            <Link className="button button--quiet" href={dayHref}>
              Back
            </Link>
            <button className="button button--primary" disabled={!canManage} type="submit">
              Close
            </button>
          </div>
        </form>
        {!canManage ? (
          <p className="detail-help">Connect the site to close nights.</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="calendar-day-panel__intro">
        {formatDisplayDate(date)} · <strong>{room.name}</strong>
      </p>
      {dayStays.length > 0 ? (
        <>
          <p className="detail-help">
            {dayStays.length === 1 ? "1 stay" : `${dayStays.length} stays`}
          </p>
          <div className="calendar-day-panel__choices">
            {dayStays.map((stay) => (
              <Link className="calendar-day-choice" href={stay.href} key={stay.key}>
                <strong>{stay.label}</strong>
                <span>{stay.sublabel}</span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      <div className="calendar-day-panel__choices">
        {soldOutForNight ? (
          fullStatus
        ) : (
          <Link className="calendar-day-choice" href={`${dayHref}&mode=walk-in`}>
            <strong>Book</strong>
            <span>
              {roomUnitNumber
                ? `Assign to #${roomUnitNumber}`
                : "Walk-in or OTA stay"}
            </span>
          </Link>
        )}
        <Link className="calendar-day-choice" href={`${dayHref}&mode=allotment`}>
          <strong>Allotment</strong>
          <span>
            Rooms to sell · default {room.availableCount}
            {hasAllotmentOverride ? ` · now ${currentAllotment}` : ""}
          </span>
        </Link>
        <Link className="calendar-day-choice" href={`${dayHref}&mode=rate`}>
          <strong>Rate</strong>
          <span>
            Nightly price · default {room.rate}
            {hasRateOverride ? ` · now ${currentRate}` : ""}
          </span>
        </Link>
        <Link className="calendar-day-choice" href={`${dayHref}&mode=block`}>
          <strong>Close</strong>
          <span>Not for sale</span>
        </Link>
      </div>
    </>
  );
}
