export type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
};

export function parseCalendarMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatCalendarMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftCalendarMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function formatCalendarMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export const PROPERTY_TIME_ZONE = "Asia/Bangkok";

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayIsoInTimeZone(timeZone: string = PROPERTY_TIME_ZONE) {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

export function getPropertyTodayIso() {
  return getTodayIsoInTimeZone(PROPERTY_TIME_ZONE);
}

export function getTodayIso() {
  return toIsoDate(new Date());
}

export function isPastCalendarDate(iso: string) {
  return iso < getTodayIso();
}

export function buildCalendarDays(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = firstOfMonth.getDay();
  const days: CalendarDay[] = [];

  for (let index = leadingDays - 1; index >= 0; index -= 1) {
    const date = new Date(year, month - 1, -index);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: true,
    });
  }

  let trailingIndex = 1;
  while (days.length % 7 !== 0) {
    const date = new Date(year, month, trailingIndex);
    days.push({
      date,
      iso: toIsoDate(date),
      inCurrentMonth: false,
    });
    trailingIndex += 1;
  }

  return days;
}

export function bookingOccupiesDay(
  booking: { arrivalDate: string; departureDate: string },
  iso: string,
) {
  return iso >= booking.arrivalDate && iso < booking.departureDate;
}

export type CalendarSpanBar = {
  key: string;
  itemKey: string;
  label: string;
  sublabel: string;
  kind: "booking" | "block";
  stayStatus: "expected" | "checked-in" | "checked-out" | "blocked";
  weekIndex: number;
  startCol: number;
  span: number;
  lane: number;
  showLabel: boolean;
  continuesLeft: boolean;
  continuesRight: boolean;
};

export type CalendarBookingBar = CalendarSpanBar & {
  kind: "booking";
  bookingKey: string;
  guest: string;
};

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function rangesOverlap(
  a: { startCol: number; span: number },
  b: { startCol: number; span: number },
) {
  return a.startCol < b.startCol + b.span && b.startCol < a.startCol + a.span;
}

function assignSpanBarLanes(
  bars: Omit<CalendarSpanBar, "lane">[],
): CalendarSpanBar[] {
  const byWeek = new Map<number, Omit<CalendarSpanBar, "lane">[]>();

  for (const bar of bars) {
    const weekBars = byWeek.get(bar.weekIndex) ?? [];
    weekBars.push(bar);
    byWeek.set(bar.weekIndex, weekBars);
  }

  const placed: CalendarSpanBar[] = [];

  for (const [, weekBars] of byWeek.entries()) {
    const lanes: { startCol: number; span: number }[] = [];

    for (const bar of weekBars.sort((left, right) => left.startCol - right.startCol)) {
      let lane = 0;

      while (lane < lanes.length && rangesOverlap(bar, lanes[lane])) {
        lane += 1;
      }

      lanes[lane] = { startCol: bar.startCol, span: bar.span };
      placed.push({ ...bar, lane });
    }
  }

  return placed.sort((left, right) => {
    if (left.weekIndex !== right.weekIndex) {
      return left.weekIndex - right.weekIndex;
    }

    if (left.lane !== right.lane) {
      return left.lane - right.lane;
    }

    return left.startCol - right.startCol;
  });
}

function buildSpanBars<T extends { arrivalDate: string; departureDate: string }>(
  items: T[],
  calendarDays: CalendarDay[],
  getItemKey: (item: T) => string,
  mapBar: (
    item: T,
    context: {
      itemKey: string;
      firstVisibleDay: string | undefined;
      weekIndex: number;
      startCol: number;
      endCol: number;
      continuesLeft: boolean;
      continuesRight: boolean;
    },
  ) => Omit<CalendarSpanBar, "lane">,
): CalendarSpanBar[] {
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < calendarDays.length; index += 7) {
    weeks.push(calendarDays.slice(index, index + 7));
  }

  const firstVisibleDayByItem = new Map<string, string>();
  const bars: Omit<CalendarSpanBar, "lane">[] = [];

  for (const item of items) {
    const itemKey = getItemKey(item);
    let firstVisibleDay = firstVisibleDayByItem.get(itemKey);

    for (const week of weeks) {
      for (const day of week) {
        if (bookingOccupiesDay(item, day.iso)) {
          if (!firstVisibleDay || day.iso < firstVisibleDay) {
            firstVisibleDay = day.iso;
          }
        }
      }
    }

    if (firstVisibleDay) {
      firstVisibleDayByItem.set(itemKey, firstVisibleDay);
    }

    weeks.forEach((week, weekIndex) => {
      const occupiedCols: number[] = [];

      week.forEach((day, columnIndex) => {
        if (bookingOccupiesDay(item, day.iso)) {
          occupiedCols.push(columnIndex + 1);
        }
      });

      if (occupiedCols.length === 0) {
        return;
      }

      let segmentStart = occupiedCols[0];
      let segmentEnd = occupiedCols[0];

      const pushSegment = (startCol: number, endCol: number) => {
        const segmentStartIso = week[startCol - 1].iso;
        const segmentEndIso = week[endCol - 1].iso;

        bars.push(
          mapBar(item, {
            itemKey,
            firstVisibleDay,
            weekIndex,
            startCol,
            endCol,
            continuesLeft: bookingOccupiesDay(item, addIsoDays(segmentStartIso, -1)),
            continuesRight: bookingOccupiesDay(item, addIsoDays(segmentEndIso, 1)),
          }),
        );
      };

      for (let index = 1; index < occupiedCols.length; index += 1) {
        const column = occupiedCols[index];
        if (column === segmentEnd + 1) {
          segmentEnd = column;
          continue;
        }

        pushSegment(segmentStart, segmentEnd);
        segmentStart = column;
        segmentEnd = column;
      }

      pushSegment(segmentStart, segmentEnd);
    });
  }

  return assignSpanBarLanes(bars);
}

export function buildRoomBookingBars(
  bookings: Array<{
    guest: string;
    stayStatus: "expected" | "checked-in" | "checked-out";
    arrivalDate: string;
    departureDate: string;
  }>,
  calendarDays: CalendarDay[],
  getBookingKey: (booking: (typeof bookings)[number]) => string,
): CalendarBookingBar[] {
  return buildSpanBars(bookings, calendarDays, getBookingKey, (booking, context) => ({
    key: `${context.itemKey}-${context.weekIndex}-${context.startCol}`,
    itemKey: context.itemKey,
    bookingKey: context.itemKey,
    guest: booking.guest,
    label: booking.guest,
    sublabel: booking.stayStatus,
    kind: "booking",
    stayStatus: booking.stayStatus,
    weekIndex: context.weekIndex,
    startCol: context.startCol,
    span: context.endCol - context.startCol + 1,
    showLabel: weekDayIso(calendarDays, context.weekIndex, context.startCol) === context.firstVisibleDay,
    continuesLeft: context.continuesLeft,
    continuesRight: context.continuesRight,
  })) as CalendarBookingBar[];
}

export function buildRoomBlockBars(
  blocks: Array<{
    id: string;
    reason: string;
    startDate: string;
    endDate: string;
  }>,
  calendarDays: CalendarDay[],
  getBlockKey: (block: (typeof blocks)[number]) => string = (block) => block.id,
): CalendarSpanBar[] {
  return buildSpanBars(
    blocks.map((block) => ({
      ...block,
      arrivalDate: block.startDate,
      departureDate: block.endDate,
    })),
    calendarDays,
    getBlockKey,
    (block, context) => ({
      key: `${context.itemKey}-${context.weekIndex}-${context.startCol}`,
      itemKey: context.itemKey,
      label: block.reason,
      sublabel: "Closed",
      kind: "block",
      stayStatus: "blocked",
      weekIndex: context.weekIndex,
      startCol: context.startCol,
      span: context.endCol - context.startCol + 1,
      showLabel: weekDayIso(calendarDays, context.weekIndex, context.startCol) === context.firstVisibleDay,
      continuesLeft: context.continuesLeft,
      continuesRight: context.continuesRight,
    }),
  );
}

export function buildRoomCalendarBars<
  T extends {
    guest: string;
    stayStatus: "expected" | "checked-in" | "checked-out";
    arrivalDate: string;
    departureDate: string;
  },
>(
  bookings: T[],
  blocks: Array<{
    id: string;
    reason: string;
    startDate: string;
    endDate: string;
  }>,
  calendarDays: CalendarDay[],
  getBookingKey: (booking: T) => string,
  getBlockKey: (block: (typeof blocks)[number]) => string = (block) => block.id,
): CalendarSpanBar[] {
  const bookingBars = buildSpanBars(bookings, calendarDays, getBookingKey, (booking, context) => ({
    key: `${context.itemKey}-${context.weekIndex}-${context.startCol}`,
    itemKey: context.itemKey,
    label: booking.guest,
    sublabel: booking.stayStatus,
    kind: "booking" as const,
    stayStatus: booking.stayStatus,
    weekIndex: context.weekIndex,
    startCol: context.startCol,
    span: context.endCol - context.startCol + 1,
    showLabel: weekDayIso(calendarDays, context.weekIndex, context.startCol) === context.firstVisibleDay,
    continuesLeft: context.continuesLeft,
    continuesRight: context.continuesRight,
  }));

  const blockBars = buildSpanBars(
    blocks.map((block) => ({
      ...block,
      arrivalDate: block.startDate,
      departureDate: block.endDate,
    })),
    calendarDays,
    getBlockKey,
    (block, context) => ({
      key: `${context.itemKey}-${context.weekIndex}-${context.startCol}`,
      itemKey: context.itemKey,
      label: block.reason,
      sublabel: "Closed",
      kind: "block" as const,
      stayStatus: "blocked" as const,
      weekIndex: context.weekIndex,
      startCol: context.startCol,
      span: context.endCol - context.startCol + 1,
      showLabel: weekDayIso(calendarDays, context.weekIndex, context.startCol) === context.firstVisibleDay,
      continuesLeft: context.continuesLeft,
      continuesRight: context.continuesRight,
    }),
  );

  return assignSpanBarLanes([...bookingBars, ...blockBars]);
}

function weekDayIso(calendarDays: CalendarDay[], weekIndex: number, startCol: number) {
  return calendarDays[weekIndex * 7 + startCol - 1]?.iso;
}

export function getCalendarWeekLaneCounts(bars: CalendarSpanBar[]) {
  const counts = new Map<number, number>();

  for (const bar of bars) {
    counts.set(bar.weekIndex, Math.max(counts.get(bar.weekIndex) ?? 0, bar.lane + 1));
  }

  return counts;
}

export function monthOverlapsBooking(
  booking: { arrivalDate: string; departureDate: string },
  year: number,
  month: number,
) {
  const monthStart = formatCalendarMonth(year, month) + "-01";
  const monthEnd = formatCalendarMonth(year, month) + `-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  return booking.arrivalDate <= monthEnd && booking.departureDate > monthStart;
}
