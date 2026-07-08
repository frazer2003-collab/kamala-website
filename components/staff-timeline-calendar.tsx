"use client";

import { memo, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  buildRoomTimelineBars,
  formatTimelineDayHeader,
  getDaySaleStatus,
  getDaySaleStatusLabel,
  getRoomBlockForDay,
  getStatusCellHref,
  getTimelineBarHref,
  getTimelineBulkAvailabilityHref,
  getTimelineDayHref,
  getTimelineLaneCount,
  type DaySaleStatus,
  type TimelineBar,
} from "@/lib/calendar-timeline";
import { getRoomsToSellForDay } from "@/lib/room-day-inventory";
import type { CalendarColors } from "@/lib/calendar-colors";
import { getCalendarColorStyleProps } from "@/lib/calendar-colors";
import { getTodayIso, isPastCalendarDate, type CalendarDay } from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import {
  getBestPercentOffForNight,
  getPromoRateForNight,
  type RoomPromotionRate,
} from "@/lib/pricing";
import { isChannelReservation, type StaffRoomBlock } from "@/lib/room-blocks";

type DayMetrics = {
  iso: string;
  columnIndex: number;
  inCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isWeekend: boolean;
  roomsLeft: number;
  netBooked: number;
  saleStatus: DaySaleStatus;
  closedColumn: boolean;
  statusHref?: string;
  bookedHref?: string;
  isSelected: boolean;
  rate: number;
  baseRate: number;
  percentOff: number;
};

type StaffExtranetRoomSectionProps = {
  room: Room;
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  inventoryLookup: Map<string, number>;
  promotions: RoomPromotionRate[];
  monthKey: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
};

function getBarClassName(bar: TimelineBar, isSelected: boolean) {
  const isChannel = bar.kind === "channel";

  return [
    "extranet-bar",
    isChannel ? "extranet-bar--channel" : "extranet-bar--booking",
    !isChannel && bar.stayStatus === "checked-in" ? "extranet-bar--checked-in" : "",
    !isChannel && bar.stayStatus === "checked-out" ? "extranet-bar--checked-out" : "",
    bar.continuesLeft ? "extranet-bar--continues-left" : "",
    bar.continuesRight ? "extranet-bar--continues-right" : "",
    bar.compact ? "extranet-bar--compact" : "",
    isSelected ? "extranet-bar--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function MetricRowLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="extranet-row__label">
      <span>{children}</span>
      {action}
    </div>
  );
}

function DayCell({
  children,
  className,
  columnIndex,
  closedColumn,
  href,
  ariaLabel,
  disabled,
}: {
  children: ReactNode;
  className: string;
  columnIndex: number;
  closedColumn?: boolean;
  href?: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const classes = [
    "extranet-cell",
    className,
    closedColumn ? "extranet-cell--closed-column" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (disabled || !href) {
    return (
      <div
        aria-disabled={disabled ? true : undefined}
        aria-label={ariaLabel}
        className={classes}
        style={{ gridColumn: columnIndex + 2 }}
      >
        {children}
      </div>
    );
  }

  return (
    <Link
      aria-label={ariaLabel}
      className={classes}
      href={href}
      style={{ gridColumn: columnIndex + 2 }}
    >
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: DaySaleStatus }) {
  return (
    <span
      className={[
        "extranet-pill",
        status === "closed"
          ? "extranet-pill--closed"
          : status === "sold-out"
            ? "extranet-pill--sold-out"
            : "extranet-pill--bookable",
      ].join(" ")}
    >
      {getDaySaleStatusLabel(status)}
    </span>
  );
}

function formatRate(amount: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
}

const StaffExtranetRoomSection = memo(function StaffExtranetRoomSection({
  room,
  bookings,
  blocks,
  calendarDays,
  inventoryLookup,
  promotions,
  monthKey,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
}: StaffExtranetRoomSectionProps) {
  const todayIso = getTodayIso();
  const dayCount = calendarDays.length;

  const roomBookings = useMemo(
    () => bookings.filter((booking) => booking.roomId === room.id),
    [bookings, room.id],
  );
  const roomBlocks = useMemo(
    () => blocks.filter((block) => block.roomId === room.id),
    [blocks, room.id],
  );
  const channelReservations = useMemo(
    () => roomBlocks.filter(isChannelReservation),
    [roomBlocks],
  );
  const manualClosures = useMemo(
    () => roomBlocks.filter((block) => !isChannelReservation(block)),
    [roomBlocks],
  );

  const bars = useMemo(
    () =>
      buildRoomTimelineBars({
        bookings: roomBookings,
        channelReservations,
        calendarDays,
      }),
    [roomBookings, channelReservations, calendarDays],
  );
  const laneCount = getTimelineLaneCount(bars);

  const dayMetrics = useMemo((): DayMetrics[] => {
    return calendarDays.map((day, columnIndex) => {
      const isPast = isPastCalendarDate(day.iso);
      const capacity = getRoomsToSellForDay(room, day.iso, inventoryLookup);
      const directBooked = roomBookings.filter(
        (booking) =>
          booking.arrivalDate <= day.iso && booking.departureDate > day.iso,
      ).length;
      const channelBooked = channelReservations.filter(
        (reservation) =>
          reservation.startDate <= day.iso && reservation.endDate > day.iso,
      ).length;
      const netBooked = directBooked + channelBooked;
      const roomsLeft = Math.max(0, capacity - netBooked);
      const saleStatus = getDaySaleStatus(room.id, day.iso, manualClosures, roomsLeft);
      const closedColumn = saleStatus === "closed" || saleStatus === "sold-out";
      const blockForDay = getRoomBlockForDay(room.id, day.iso, manualClosures);
      const firstBooking = roomBookings.find(
        (booking) =>
          booking.arrivalDate <= day.iso && booking.departureDate > day.iso,
      );
      const isSelected =
        (selectedRoomId === room.id && selectedDate === day.iso) ||
        Boolean(
          blockForDay &&
            selectedBlockKey === (blockForDay.databaseId ?? blockForDay.id),
        );
      const weekday = day.date.getDay();
      const percentOff = getBestPercentOffForNight(room.id, day.iso, promotions);
      const rate = getPromoRateForNight(room.id, day.iso, room.rate, promotions);

      return {
        iso: day.iso,
        columnIndex,
        inCurrentMonth: day.inCurrentMonth,
        isPast,
        isToday: day.iso === todayIso,
        isWeekend: weekday === 0 || weekday === 6,
        roomsLeft,
        netBooked,
        saleStatus,
        closedColumn,
        statusHref: isPast
          ? undefined
          : saleStatus === "sold-out"
            ? getTimelineDayHref(room.id, day.iso, monthKey)
            : getStatusCellHref(room.id, day.iso, monthKey, manualClosures),
        bookedHref: isPast
          ? undefined
          : firstBooking
            ? getTimelineBarHref(
                {
                  kind: "booking",
                  itemKey: firstBooking.databaseId ?? firstBooking.id,
                },
                monthKey,
              )
            : getTimelineDayHref(room.id, day.iso, monthKey),
        isSelected,
        rate,
        baseRate: room.rate,
        percentOff,
      };
    });
  }, [
    calendarDays,
    channelReservations,
    inventoryLookup,
    manualClosures,
    monthKey,
    promotions,
    room,
    roomBookings,
    selectedBlockKey,
    selectedDate,
    selectedRoomId,
    todayIso,
  ]);

  const firstFutureDay = dayMetrics.find((day) => !day.isPast && day.inCurrentMonth)?.iso
    ?? dayMetrics.find((day) => !day.isPast)?.iso;

  return (
    <section aria-label={room.name} className="extranet-room">
      <div className="extranet-room__header">
        <div className="extranet-room__title">
          <h3>{room.name}</h3>
          <p>Room ID · {room.id}</p>
        </div>
        {firstFutureDay && canManage ? (
          <Link
            className="extranet-room__bulk"
            href={getTimelineBulkAvailabilityHref(room.id, monthKey)}
          >
            Close dates
          </Link>
        ) : null}
      </div>

      <div
        className="extranet-room__grid"
        style={{ ["--timeline-days" as string]: dayCount }}
      >
        <MetricRowLabel>Room status</MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={`${room.name} status on ${day.iso}: ${getDaySaleStatusLabel(day.saleStatus)}`}
            className={[
              day.isPast ? "extranet-cell--past" : "",
              day.isSelected ? "extranet-cell--selected" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast}
            href={day.statusHref}
            key={`status-${day.iso}`}
          >
            <StatusPill status={day.saleStatus} />
          </DayCell>
        ))}

        <MetricRowLabel>
          Rooms left
          <span className="extranet-row__meta">of {room.availableCount}</span>
        </MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={`${day.roomsLeft} of ${room.availableCount} rooms left on ${day.iso}`}
            className={[
              "extranet-cell--metric",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            key={`left-${day.iso}`}
          >
            <span className="extranet-metric">{day.roomsLeft}</span>
          </DayCell>
        ))}

        <MetricRowLabel>Net booked</MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={`${day.netBooked} booked on ${day.iso}`}
            className={[
              "extranet-cell--metric",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            disabled={day.isPast && day.netBooked === 0}
            href={day.bookedHref}
            key={`booked-${day.iso}`}
          >
            {day.netBooked > 0 ? (
              <span className="extranet-pill extranet-pill--booked">{day.netBooked}</span>
            ) : null}
          </DayCell>
        ))}

        <MetricRowLabel>
          Standard rate
          <span className="extranet-row__meta">Sleeps {room.sleeps.replace(/^Sleeps\s+/i, "")}</span>
        </MetricRowLabel>
        {dayMetrics.map((day) => (
          <DayCell
            ariaLabel={
              day.percentOff > 0
                ? `Promo rate on ${day.iso}: ${formatRate(day.rate)}, ${day.percentOff}% off`
                : `Rate on ${day.iso}: ${formatRate(day.rate)}`
            }
            className={[
              "extranet-cell--rate",
              day.percentOff > 0 ? "extranet-cell--promo" : "",
              day.isPast ? "extranet-cell--past" : "",
              !day.inCurrentMonth ? "extranet-cell--muted" : "",
              day.isWeekend ? "extranet-cell--weekend" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            closedColumn={day.closedColumn}
            columnIndex={day.columnIndex}
            href="/staff/promotions"
            key={`rate-${day.iso}`}
          >
            {day.percentOff > 0 ? (
              <span className="extranet-rate extranet-rate--promo">
                <span className="extranet-rate__was">{formatRate(day.baseRate)}</span>
                <strong>{formatRate(day.rate)}</strong>
                <span className="extranet-rate__off">-{day.percentOff}%</span>
              </span>
            ) : (
              <span className="extranet-rate">{formatRate(day.rate)}</span>
            )}
          </DayCell>
        ))}

        <MetricRowLabel>Reservations</MetricRowLabel>
        <div
          className="extranet-reservations"
          style={{
            ["--lane-count" as string]: laneCount,
            gridColumn: `2 / span ${dayCount}`,
          }}
        >
          {dayMetrics.map((day) => (
            <div
              className={[
                "extranet-reservations__day",
                day.closedColumn ? "extranet-cell--closed-column" : "",
                day.isToday ? "extranet-cell--today" : "",
                !day.inCurrentMonth ? "extranet-cell--muted" : "",
                day.isWeekend ? "extranet-cell--weekend" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`res-bg-${day.iso}`}
              style={{ gridColumn: day.columnIndex + 1 }}
            />
          ))}

          {bars.map((bar) => {
            const isSelected =
              bar.kind === "booking"
                ? selectedBookingKey === bar.itemKey
                : selectedBlockKey === bar.itemKey;
            const sublabel = bar.sublabel;

            return (
              <Link
                aria-label={`${bar.label}, ${sublabel}`}
                className={getBarClassName(bar, isSelected)}
                href={getTimelineBarHref(bar, monthKey)}
                key={bar.key}
                style={{
                  gridColumn: `${bar.startCol} / span ${bar.span}`,
                  ["--lane" as string]: bar.lane,
                }}
                title={`${bar.label} · ${sublabel}`}
              >
                {bar.showLabel ? (
                  <>
                    <strong>{bar.label}</strong>
                    {bar.compact ? null : <span>{sublabel}</span>}
                  </>
                ) : (
                  <span className="extranet-bar__continued" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
});

type StaffTimelineCalendarProps = {
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  calendarColors: CalendarColors;
  inventoryLookup: Map<string, number>;
  promotions: RoomPromotionRate[];
  monthKey: string;
  monthLabel: string;
  canManage: boolean;
  selectedBookingKey: string;
  selectedBlockKey: string;
  selectedDate?: string;
  selectedRoomId?: string;
};

export function StaffTimelineCalendar({
  rooms,
  bookings,
  blocks,
  calendarDays,
  calendarColors,
  inventoryLookup,
  promotions,
  monthKey,
  monthLabel,
  canManage,
  selectedBookingKey,
  selectedBlockKey,
  selectedDate,
  selectedRoomId,
}: StaffTimelineCalendarProps) {
  const todayIso = getTodayIso();
  const dayCount = calendarDays.length;

  return (
    <div className="staff-extranet" style={getCalendarColorStyleProps(calendarColors)}>
      <div className="staff-extranet__scroll" tabIndex={0}>
        <div
          className="staff-extranet__dates"
          style={{ ["--timeline-days" as string]: dayCount }}
        >
          <div className="staff-extranet__month">{monthLabel}</div>
          {calendarDays.map((day, columnIndex) => {
            const header = formatTimelineDayHeader(day.date, day.iso, todayIso);

            return (
              <div
                className={[
                  "staff-extranet__dayhead",
                  header.isWeekend ? "staff-extranet__dayhead--weekend" : "",
                  header.isToday ? "staff-extranet__dayhead--today" : "",
                  !day.inCurrentMonth ? "staff-extranet__dayhead--muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day.iso}
                style={{ gridColumn: columnIndex + 2 }}
              >
                <span className="staff-extranet__weekday">{header.weekday}</span>
                <span className="staff-extranet__daynum">{header.dayNumber}</span>
              </div>
            );
          })}
        </div>

        {rooms.map((room) => (
          <StaffExtranetRoomSection
            blocks={blocks}
            bookings={bookings}
            calendarDays={calendarDays}
            canManage={canManage}
            inventoryLookup={inventoryLookup}
            key={room.id}
            monthKey={monthKey}
            promotions={promotions}
            room={room}
            selectedBlockKey={selectedBlockKey}
            selectedBookingKey={selectedBookingKey}
            selectedDate={selectedDate}
            selectedRoomId={selectedRoomId}
          />
        ))}
      </div>
    </div>
  );
}
