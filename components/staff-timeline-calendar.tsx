"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarJumpToToday } from "@/components/calendar-jump-to-today";
import { CalendarStayBarLink } from "@/components/calendar-stay-bar-link";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import {
  buildRoomTimelineBars,
  buildUnitTimelineBars,
  formatTimelineDayHeader,
  getTimelineBarHref,
  getTimelineDayHref,
  getTimelineLaneCount,
  type TimelineBar,
} from "@/lib/calendar-timeline";
import type { CalendarColors } from "@/lib/calendar-colors";
import { getCalendarColorStyleProps } from "@/lib/calendar-colors";
import {
  formatCalendarMonthLabelFromIso,
  getTodayIso,
  pickLeadingVisibleCalendarDayIso,
  type CalendarDay,
} from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import type { RoomPromotionRate } from "@/lib/pricing";
import {
  getStaffRoomBlockKey,
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import {
  getPrimaryRoomIdForUnit,
  getTimelineDoorUnits,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";
import { InlineRoomAssign } from "@/components/inline-room-assign";
import {
  assignGuestBarColors,
  guestBarColorForName,
} from "@/lib/booking-bar-colors";

type StaffTimelineCalendarProps = {
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  calendarColors: CalendarColors;
  inventoryLookup: Map<string, number>;
  rateLookup: Map<string, number>;
  promotions: RoomPromotionRate[];
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  monthLabel: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  currency: PropertyCurrency;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
};

function getBarClassName(bar: TimelineBar, isSelected: boolean) {
  return [
    "extranet-bar",
    "extranet-bar--guest-color",
    bar.needsRoom ? "extranet-bar--needs-room" : "",
    bar.continuesLeft ? "extranet-bar--continues-left" : "",
    bar.continuesRight ? "extranet-bar--continues-right" : "",
    bar.compact ? "extranet-bar--compact" : "",
    isSelected ? "extranet-bar--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getBarColorStyle(bar: TimelineBar, guestColors: Map<string, string>) {
  const color = guestBarColorForName(bar.colorKey || bar.label, guestColors);
  return {
    ["--bar-color" as string]: color,
  };
}

function MetricRowLabel({
  children,
  className,
  hint,
}: {
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div
      className={["extranet-row__label", className].filter(Boolean).join(" ")}
      title={hint}
    >
      <span>
        {children}
        {hint ? <span className="extranet-row__hint">{hint}</span> : null}
      </span>
    </div>
  );
}

function DoorReservationRow({
  unit,
  bookings,
  channelReservations,
  calendarDays,
  monthKey,
  fromIso,
  toIso,
  guestColors,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  todayIso,
}: {
  unit: RoomUnit;
  bookings: StaffBooking[];
  channelReservations: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  guestColors: Map<string, string>;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
  todayIso: string;
}) {
  const dayCount = calendarDays.length;
  const rangeQuery = { fromIso, toIso };
  const primaryRoomId = getPrimaryRoomIdForUnit(unit);
  const unitBookings = useMemo(
    () => bookings.filter((booking) => booking.roomUnitId === unit.id),
    [bookings, unit.id],
  );
  const unitChannels = useMemo(
    () =>
      channelReservations.filter((reservation) => reservation.roomUnitId === unit.id),
    [channelReservations, unit.id],
  );
  const bars = useMemo(
    () =>
      buildUnitTimelineBars({
        bookings: unitBookings,
        channelReservations: unitChannels,
        calendarDays,
      }),
    [unitBookings, unitChannels, calendarDays],
  );
  const laneCount = getTimelineLaneCount(bars);

  return (
    <>
      <MetricRowLabel className="extranet-row__label--door">
        <span className="extranet-unit-number">{unit.number}</span>
        {unit.roomIds.length > 1 ? (
          <span className="extranet-row__meta">Shared</span>
        ) : null}
      </MetricRowLabel>
      <div
        className="extranet-reservations extranet-reservations--unit"
        style={{
          ["--lane-count" as string]: laneCount,
          gridColumn: `2 / span ${dayCount}`,
        }}
      >
        {calendarDays.map((day, columnIndex) => {
          const weekday = day.date.getDay();
          const isToday = day.iso === todayIso;
          const isWeekend = weekday === 0 || weekday === 6;
          const isSelectedDay =
            Boolean(primaryRoomId) &&
            selectedRoomId === primaryRoomId &&
            selectedDate === day.iso;
          const dayHref = primaryRoomId
            ? getTimelineDayHref(primaryRoomId, day.iso, monthKey, rangeQuery)
            : undefined;

          const dayClass = [
            "extranet-reservations__day",
            isToday ? "extranet-cell--today" : "",
            !day.inCurrentMonth ? "extranet-cell--muted" : "",
            isWeekend ? "extranet-cell--weekend" : "",
            isSelectedDay ? "extranet-cell--selected" : "",
            dayHref ? "extranet-reservations__day--action" : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (dayHref) {
            return (
              <Link
                aria-label={`Room ${unit.number}, ${day.iso}: day actions`}
                className={dayClass}
                href={dayHref}
                key={`door-${unit.id}-bg-${day.iso}`}
                style={{ gridColumn: columnIndex + 1 }}
                title="Open day actions"
              >
                <span className="sr-only">Open day actions</span>
              </Link>
            );
          }

          return (
            <div
              className={dayClass}
              key={`door-${unit.id}-bg-${day.iso}`}
              style={{ gridColumn: columnIndex + 1 }}
            />
          );
        })}

        {bars.map((bar) => {
          const isSelected =
            bar.kind === "booking"
              ? selectedBookingKey === bar.itemKey
              : selectedBlockKey === bar.itemKey;
          const ariaExtra = bar.sublabel ? `, ${bar.sublabel}` : "";

          return (
            <CalendarStayBarLink
              ariaLabel={`Room ${unit.number}: ${bar.label}${ariaExtra}`}
              className={getBarClassName(bar, isSelected)}
              href={getTimelineBarHref(bar, monthKey, rangeQuery)}
              itemKey={bar.itemKey}
              key={bar.key}
              kind={bar.kind === "booking" ? "booking" : "block"}
              style={{
                gridColumn: `${bar.startCol} / span ${bar.span}`,
                ["--lane" as string]: bar.lane,
                ...getBarColorStyle(bar, guestColors),
              }}
            >
              {bar.showLabel ? (
                <>
                  <strong>{bar.label}</strong>
                  {bar.compact || !bar.sublabel ? null : <span>{bar.sublabel}</span>}
                </>
              ) : (
                <span className="extranet-bar__continued" aria-hidden="true" />
              )}
            </CalendarStayBarLink>
          );
        })}
      </div>
    </>
  );
}

function UnassignedReservationRow({
  bookings,
  channelReservations,
  calendarDays,
  monthKey,
  fromIso,
  toIso,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  guestColors,
  roomUnits,
  occupancies,
  roomShortNameById,
  todayIso,
}: {
  bookings: StaffBooking[];
  channelReservations: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  guestColors: Map<string, string>;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  roomShortNameById: Map<string, string>;
  todayIso: string;
}) {
  const dayCount = calendarDays.length;
  const rangeQuery = { fromIso, toIso };
  const bars = useMemo(
    () =>
      buildRoomTimelineBars({
        bookings,
        channelReservations,
        calendarDays,
        unassignedOnly: true,
      }),
    [bookings, channelReservations, calendarDays],
  );
  const laneCount = getTimelineLaneCount(bars);
  const unassignedCount =
    bookings.filter((booking) => !booking.roomUnitId).length +
    channelReservations.filter((reservation) => !reservation.roomUnitId).length;

  if (unassignedCount === 0) {
    return null;
  }

  return (
    <div
      aria-label="Stays that need a room number"
      className="extranet-doors__unassigned"
      style={{ ["--timeline-days" as string]: dayCount }}
    >
      <MetricRowLabel
        className="extranet-row__label--needs-room"
        hint="Assign a room number on the stay bar"
      >
        Needs room #
        <span className="extranet-row__meta">{unassignedCount} waiting</span>
      </MetricRowLabel>
      <div
        className={[
          "extranet-reservations",
          canManage ? "extranet-reservations--assign" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ["--lane-count" as string]: laneCount,
          gridColumn: `2 / span ${dayCount}`,
        }}
      >
        {calendarDays.map((day, columnIndex) => {
          const weekday = day.date.getDay();
          return (
            <div
              className={[
                "extranet-reservations__day",
                day.iso === todayIso ? "extranet-cell--today" : "",
                !day.inCurrentMonth ? "extranet-cell--muted" : "",
                weekday === 0 || weekday === 6 ? "extranet-cell--weekend" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`unassigned-bg-${day.iso}`}
              style={{ gridColumn: columnIndex + 1 }}
            />
          );
        })}

        {bars.map((bar) => {
          const isSelected =
            bar.kind === "booking"
              ? selectedBookingKey === bar.itemKey
              : selectedBlockKey === bar.itemKey;
          const sourceBooking =
            bar.kind === "booking"
              ? bookings.find((booking) => getStaffBookingKey(booking) === bar.itemKey)
              : null;
          const sourceChannel =
            bar.kind === "channel"
              ? channelReservations.find(
                  (reservation) => getStaffRoomBlockKey(reservation) === bar.itemKey,
                )
              : null;
          const stayId =
            sourceBooking?.databaseId ?? sourceChannel?.databaseId ?? null;
          const stayRoomId = sourceBooking?.roomId ?? sourceChannel?.roomId ?? "";
          const typeLabel =
            roomShortNameById.get(stayRoomId) ??
            sourceBooking?.room ??
            stayRoomId;
          const showInlineAssign =
            canManage && Boolean(stayId) && bar.needsRoom && bar.showLabel;
          const detailHref = getTimelineBarHref(bar, monthKey, rangeQuery);
          const sublabel = typeLabel
            ? `${typeLabel} · Needs room #`
            : bar.sublabel;

          return (
            <div
              className={[
                "extranet-bar-shell",
                showInlineAssign ? "extranet-bar-shell--assign" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={bar.key}
              style={{
                gridColumn: `${bar.startCol} / span ${bar.span}`,
                ["--lane" as string]: bar.lane,
                ...getBarColorStyle(bar, guestColors),
              }}
            >
              <CalendarStayBarLink
                ariaLabel={`${bar.label}, ${sublabel}`}
                className={[getBarClassName(bar, isSelected), "extranet-bar__open"].join(
                  " ",
                )}
                href={detailHref}
                itemKey={bar.itemKey}
                kind={bar.kind === "booking" ? "booking" : "block"}
              >
                {bar.showLabel ? (
                  <>
                    <strong>{bar.label}</strong>
                    {bar.compact ? null : <span>{sublabel}</span>}
                  </>
                ) : (
                  <span className="extranet-bar__continued" aria-hidden="true" />
                )}
              </CalendarStayBarLink>
              {showInlineAssign && stayId ? (
                <InlineRoomAssign
                  arrivalDate={
                    sourceBooking?.arrivalDate ?? sourceChannel?.startDate ?? ""
                  }
                  departureDate={
                    sourceBooking?.departureDate ?? sourceChannel?.endDate ?? ""
                  }
                  fromIso={fromIso}
                  guestLabel={bar.label}
                  kind={bar.kind === "booking" ? "booking" : "channel"}
                  monthKey={monthKey}
                  occupancies={occupancies}
                  roomId={stayRoomId}
                  roomUnits={roomUnits}
                  stayId={stayId}
                  toIso={toIso}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StaffTimelineCalendar({
  rooms,
  bookings,
  blocks,
  calendarDays,
  calendarColors,
  inventoryLookup: _inventoryLookup,
  rateLookup: _rateLookup,
  promotions: _promotions,
  monthKey,
  fromIso,
  toIso,
  monthLabel,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
  currency: _currency,
  roomUnits,
  occupancies,
}: StaffTimelineCalendarProps) {
  void _inventoryLookup;
  void _rateLookup;
  void _promotions;
  void _currency;

  const todayIso = getTodayIso();
  const dayCount = calendarDays.length;
  const staySelection = useCalendarStaySelection();
  const activeBookingKey = staySelection?.bookingKey || selectedBookingKey;
  const activeBlockKey = staySelection?.blockKey || selectedBlockKey;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleMonthLabel, setVisibleMonthLabel] = useState(monthLabel);
  const fitMonthDayCount = Math.max(
    28,
    calendarDays.filter((day) => day.iso.startsWith(`${monthKey}-`)).length ||
      new Date(
        Number(monthKey.slice(0, 4)),
        Number(monthKey.slice(5, 7)),
        0,
      ).getDate(),
  );

  const channelReservations = useMemo(
    () => blocks.filter(isChannelReservation),
    [blocks],
  );
  const doorUnits = useMemo(() => getTimelineDoorUnits(roomUnits), [roomUnits]);
  const roomShortNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of rooms) {
      map.set(room.id, room.shortName);
    }
    return map;
  }, [rooms]);

  const guestColors = useMemo(() => {
    const names: string[] = [];
    for (const booking of bookings) {
      names.push(booking.guest);
    }
    for (const block of blocks) {
      if (!isChannelReservation(block)) {
        continue;
      }
      names.push(block.guestName.trim() || block.channelLabel || "Channel");
    }
    return assignGuestBarColors(names);
  }, [bookings, blocks]);

  useEffect(() => {
    setVisibleMonthLabel(monthLabel);
  }, [monthLabel]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }

    let frame = 0;
    const updateVisibleMonth = () => {
      frame = 0;
      const monthCell = root.querySelector<HTMLElement>(".staff-extranet__month");
      const dayHeads = root.querySelectorAll<HTMLElement>("[data-calendar-day]");
      if (!monthCell || dayHeads.length === 0) {
        return;
      }

      const labelRight = monthCell.getBoundingClientRect().right;
      const days = Array.from(dayHeads, (dayHead) => {
        const rect = dayHead.getBoundingClientRect();
        return {
          iso: dayHead.dataset.calendarDay ?? "",
          left: rect.left,
          right: rect.right,
        };
      }).filter((day) => day.iso.length > 0);

      const leadingIso = pickLeadingVisibleCalendarDayIso(days, labelRight);
      if (!leadingIso) {
        return;
      }

      const nextLabel = formatCalendarMonthLabelFromIso(leadingIso);
      setVisibleMonthLabel((current) => (current === nextLabel ? current : nextLabel));
    };

    const onScrollOrResize = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(updateVisibleMonth);
    };

    updateVisibleMonth();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    const resizeObserver = new ResizeObserver(onScrollOrResize);
    resizeObserver.observe(root);

    return () => {
      root.removeEventListener("scroll", onScrollOrResize);
      resizeObserver.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [calendarDays, monthLabel]);

  return (
    <div
      className="staff-extranet staff-extranet--doors"
      style={{
        ...getCalendarColorStyleProps(calendarColors),
        ["--extranet-fit-month-days" as string]: String(fitMonthDayCount),
      }}
    >
      <CalendarJumpToToday />
      <h2 className="sr-only">Room numbers by day</h2>
      <div className="staff-extranet__scroll" id="calendar-today" ref={scrollRef}>
        <div
          className="staff-extranet__dates"
          style={{ ["--timeline-days" as string]: dayCount }}
        >
          <div aria-live="polite" className="staff-extranet__month">
            {visibleMonthLabel}
          </div>
          {calendarDays.map((day, columnIndex) => {
            const header = formatTimelineDayHeader(day.date, day.iso, todayIso);
            const isMonthStart = header.dayNumber === 1;

            return (
              <div
                aria-current={header.isToday ? "date" : undefined}
                className={[
                  "staff-extranet__dayhead",
                  header.isWeekend ? "staff-extranet__dayhead--weekend" : "",
                  header.isToday ? "staff-extranet__dayhead--today extranet-cell--today" : "",
                  isMonthStart ? "staff-extranet__dayhead--month-start" : "",
                  !day.inCurrentMonth ? "staff-extranet__dayhead--muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-calendar-day={day.iso}
                key={day.iso}
                style={{ gridColumn: columnIndex + 2 }}
              >
                <span className="staff-extranet__weekday">{header.weekday}</span>
                <span className="staff-extranet__daynum">{header.dayNumber}</span>
              </div>
            );
          })}
        </div>

        <UnassignedReservationRow
          bookings={bookings}
          calendarDays={calendarDays}
          canManage={canManage}
          channelReservations={channelReservations}
          fromIso={fromIso}
          guestColors={guestColors}
          monthKey={monthKey}
          occupancies={occupancies}
          roomShortNameById={roomShortNameById}
          roomUnits={roomUnits}
          selectedBlockKey={activeBlockKey}
          selectedBookingKey={activeBookingKey}
          toIso={toIso}
          todayIso={todayIso}
        />

        <div
          aria-label="Room numbers"
          className="extranet-doors"
          style={{ ["--timeline-days" as string]: dayCount }}
        >
          {doorUnits.length > 0 ? (
            doorUnits.map((unit) => (
              <DoorReservationRow
                bookings={bookings}
                calendarDays={calendarDays}
                channelReservations={channelReservations}
                fromIso={fromIso}
                guestColors={guestColors}
                key={unit.id}
                monthKey={monthKey}
                selectedBlockKey={activeBlockKey}
                selectedBookingKey={activeBookingKey}
                selectedDate={selectedDate}
                selectedRoomId={selectedRoomId}
                toIso={toIso}
                todayIso={todayIso}
                unit={unit}
              />
            ))
          ) : (
            <p className="extranet-doors__empty">
              No room numbers set up yet. Add doors under Settings → Rooms.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
