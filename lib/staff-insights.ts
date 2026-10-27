import {
  formatCalendarMonthLabel,
  getCalendarMonthBounds,
  type CalendarDay,
  bookingOccupiesDay,
} from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import {
  BOOKING_SOURCE_LABELS,
  type BookingSource,
} from "@/lib/booking-source";
import type { Room } from "@/lib/content";
import {
  eachStayNight,
  getNightlyRateDetails,
  type RoomPromotionRate,
} from "@/lib/pricing";
import { calculateStripeChargeAmount } from "@/lib/payment-pricing";
import {
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";

export type StaffInsightsSourceCount = {
  label: string;
  stays: number;
};

export type StaffInsightsRoomRow = {
  roomId: string;
  roomName: string;
  nightsSold: number;
  /** Door-nights that could have sold (open days × doors; closed days excluded). */
  nightsAvailable: number;
  /** nightsSold / nightsAvailable capped at 100; null when capacity is 0. */
  soldPercent: number | null;
  /** Nights sold above capacity (overbook); 0 when within capacity. */
  nightsOverCapacity: number;
  stayCount: number;
  websiteRevenue: number;
  /** Card bank charge on saved stays, for nights in the range. Kept out of the room price. */
  bankCharge: number;
  /** Room price for nights in the range that have already happened. */
  earnedRoomRevenue: number;
  /** Bank charge for nights in the range that have already happened. */
  earnedBankCharge: number;
  /** Nights with a saved room price that have already happened. */
  earnedPricedNights: number;
  channelRevenue: number;
  /** Room price plus bank charge for nights in the range. */
  estimatedRevenue: number;
  /** Room price plus bank charge for nights in the range that have already happened. */
  earnedRevenue: number;
  /** Room price plus bank charge for nights in the range that are still ahead. */
  unearnedRevenue: number;
  /** Channel nights in range with no saved price. Left out of the money. */
  unpricedNights: number;
  /**
   * Stays in range whose recorded stay total was used as-is. Above zero means
   * the money shown is what staff entered, so a 0 figure is a real 0 and not a
   * gap in the data.
   */
  recordedStayCount: number;
  /** Stays on record for a room type that is no longer configured. */
  isUnconfigured: boolean;
  sources: StaffInsightsSourceCount[];
  /** Current published nightly rate. Null when the room type was removed. */
  publishedRate: number | null;
  /** Nights in range with a saved room price. Channel nights are not included. */
  pricedNights: number;
  /** Saved room price per priced night. The card bank charge is not included. */
  agreedNightlyRate: number | null;
  /** Empty door-nights from today through the end of the range. */
  nightsStillOpen: number;
  /** What the published rate and the empty nights suggest. */
  priceCue: string;
  /** Paid stays: room price plus card bank charge for nights in the range. */
  collected: number;
  collectedEarned: number;
  collectedBankCharge: number;
  /** Stays on the books with no payment marked. */
  unpaid: number;
  unpaidEarned: number;
  /** Part of unpaid where the guest claimed a bank transfer. */
  bankClaimedUnpaid: number;
  /** Bank refunds staff still have to send. */
  refundsToSend: number;
  attention: StaffInsightsAttention[];
};

export type StaffInsightsAttention = {
  kind: "unpaid-stayed" | "bank-claimed" | "refund";
  bookingId: string;
  guestName: string;
  roomName: string;
  amount: number;
};

export type StaffInsightsReport = {
  year: number;
  month: number;
  monthLabel: string;
  rangeLabel: string;
  monthStart: string;
  monthEnd: string;
  rooms: StaffInsightsRoomRow[];
  totals: {
    nightsSold: number;
    stayCount: number;
    websiteRevenue: number;
    bankCharge: number;
    earnedRoomRevenue: number;
    earnedBankCharge: number;
    channelRevenue: number;
    estimatedRevenue: number;
    earnedRevenue: number;
    unearnedRevenue: number;
    unpricedNights: number;
    averageNightlyRate: number | null;
    /** Stays in range whose recorded stay total was used as-is. */
    recordedStayCount: number;
    /** Nights sold against room types that are still sellable, for occupancy. */
    nightsSoldInCapacity: number;
    nightsAvailable: number;
    nightsOverCapacity: number;
    soldPercent: number | null;
    /** Empty door-nights from today through the end of the range. */
    nightsStillOpen: number;
    /** Empty door-nights before today. Already passed, not still for sale. */
    nightsPassedUnsold: number;
  };
  accounts: {
    /** Paid stays: room price plus card bank charge for nights in the range. */
    collected: number;
    collectedEarned: number;
    /** Paid, and the night has not happened yet. */
    collectedAhead: number;
    collectedBankCharge: number;
    /** Stays on the books with no payment marked. */
    unpaid: number;
    /** Unpaid money for nights that have already happened. */
    unpaidEarned: number;
    /** Part of unpaid where the guest claimed a bank transfer. */
    bankClaimedUnpaid: number;
    /** Bank refunds staff still have to send. The site does not move this money. */
    refundsToSend: number;
  };
  /** Stays the owner should open: unpaid nights already stayed, claimed transfers, refunds to send. */
  attention: StaffInsightsAttention[];
  revenueNote: string;
};

function addIsoDay(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Count stay nights that fall inside [rangeStart, rangeEnd] inclusive. */
export function countNightsInMonth(
  arrival: string,
  departure: string,
  rangeStart: string,
  rangeEnd: string,
) {
  if (!arrival || !departure || departure <= arrival) {
    return 0;
  }

  const lastNight = addIsoDay(departure, -1);
  const visibleStart = arrival < rangeStart ? rangeStart : arrival;
  const visibleLastNight = lastNight > rangeEnd ? rangeEnd : lastNight;

  if (visibleStart > visibleLastNight) {
    return 0;
  }

  const start = new Date(`${visibleStart}T00:00:00`);
  const end = new Date(`${visibleLastNight}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * Sum nightly rates for stay nights that fall inside the range,
 * using the same quote rules as website bookings (day override → promo → base).
 */
export function estimateQuotedMoneyInMonth({
  roomId,
  baseRate,
  arrival,
  departure,
  monthStart,
  monthEnd,
  promotions,
  rateOverrides,
}: {
  roomId: string;
  baseRate: number;
  arrival: string;
  departure: string;
  monthStart: string;
  monthEnd: string;
  promotions: RoomPromotionRate[];
  rateOverrides?: Map<string, number>;
}) {
  if (baseRate <= 0) {
    return 0;
  }

  let total = 0;
  for (const night of eachStayNight(arrival, departure)) {
    if (night < monthStart || night > monthEnd) {
      continue;
    }
    total += getNightlyRateDetails(
      roomId,
      night,
      baseRate,
      promotions,
      rateOverrides,
    ).rate;
  }
  return total;
}

/**
 * Whether a stay carries a price staff actually agreed to. Stay totals are
 * stored not-null and never negative, so anything in range counts — including 0
 * for a comped stay or a full discount.
 */
export function hasRecordedTotal(estimatedTotal: number | null | undefined) {
  return typeof estimatedTotal === "number" && Number.isFinite(estimatedTotal) && estimatedTotal >= 0;
}

/**
 * Allocate a saved full-stay total across only the nights that fall in range.
 * Keeps Finance money aligned with clipped nightsSold.
 */
export function prorateStayMoneyInRange({
  estimatedTotal,
  arrival,
  departure,
  rangeStart,
  rangeEnd,
}: {
  estimatedTotal: number;
  arrival: string;
  departure: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  if (estimatedTotal <= 0) {
    return 0;
  }
  const stayNights = eachStayNight(arrival, departure).length;
  if (stayNights <= 0) {
    return 0;
  }
  const nightsInRange = countNightsInMonth(
    arrival,
    departure,
    rangeStart,
    rangeEnd,
  );
  if (nightsInRange <= 0) {
    return 0;
  }
  return Math.round(estimatedTotal * (nightsInRange / stayNights));
}

/**
 * Split a saved amount into nights inside the range, then into nights that
 * have already happened. Omitting today treats the whole range as earned.
 */
export function splitStayMoneyInRange({
  amount,
  arrival,
  departure,
  rangeStart,
  rangeEnd,
  todayIso,
}: {
  amount: number;
  arrival: string;
  departure: string;
  rangeStart: string;
  rangeEnd: string;
  todayIso?: string;
}) {
  const inRange = prorateStayMoneyInRange({
    estimatedTotal: amount,
    arrival,
    departure,
    rangeStart,
    rangeEnd,
  });
  if (inRange <= 0) {
    return { inRange: 0, earned: 0 };
  }
  if (!todayIso || todayIso >= rangeEnd) {
    return { inRange, earned: inRange };
  }
  if (todayIso < rangeStart) {
    return { inRange, earned: 0 };
  }

  const stayNights = eachStayNight(arrival, departure).length;
  const earnedNights = countNightsInMonth(arrival, departure, rangeStart, todayIso);
  const earned =
    stayNights > 0 ? Math.min(inRange, Math.round(amount * (earnedNights / stayNights))) : 0;
  return { inRange, earned };
}

/** Door-nights that could sell: open days × doors (staff closes remove the day). */
export function countSellableDoorNights({
  availableCount,
  calendarDays,
  staffClosures,
  roomId,
}: {
  availableCount: number;
  calendarDays: CalendarDay[];
  staffClosures: Array<{ roomId: string; startDate: string; endDate: string }>;
  roomId: string;
}) {
  const doors = Math.max(0, availableCount);
  if (doors <= 0 || calendarDays.length === 0) {
    return 0;
  }

  const roomClosures = staffClosures.filter((block) => block.roomId === roomId);
  let total = 0;
  for (const day of calendarDays) {
    const closed = roomClosures.some((block) =>
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        day.iso,
      ),
    );
    if (!closed) {
      total += doors;
    }
  }
  return total;
}

/**
 * Empty door-nights. Days before today have already passed, so they are not
 * still open. Omitting today treats the whole range as still ahead.
 */
export function countUnsoldDoorNights({
  rooms,
  calendarDays,
  staffClosures,
  bookings,
  channelStays,
  todayIso,
}: {
  rooms: Array<{ id: string; availableCount: number }>;
  calendarDays: CalendarDay[];
  staffClosures: Array<{ roomId: string; startDate: string; endDate: string }>;
  bookings: Array<{ roomId: string; arrivalDate: string; departureDate: string }>;
  channelStays: Array<{ roomId: string; startDate: string; endDate: string }>;
  todayIso?: string;
}) {
  let nightsStillOpen = 0;
  let nightsPassedUnsold = 0;

  for (const room of rooms) {
    const doors = Math.max(0, room.availableCount);
    if (doors <= 0) {
      continue;
    }
    const roomClosures = staffClosures.filter((block) => block.roomId === room.id);
    for (const day of calendarDays) {
      const closed = roomClosures.some((block) =>
        bookingOccupiesDay(
          { arrivalDate: block.startDate, departureDate: block.endDate },
          day.iso,
        ),
      );
      if (closed) {
        continue;
      }
      let occupied = 0;
      for (const booking of bookings) {
        if (booking.roomId === room.id && bookingOccupiesDay(booking, day.iso)) {
          occupied += 1;
        }
      }
      for (const stay of channelStays) {
        if (
          stay.roomId === room.id &&
          bookingOccupiesDay(
            { arrivalDate: stay.startDate, departureDate: stay.endDate },
            day.iso,
          )
        ) {
          occupied += 1;
        }
      }
      const open = Math.max(0, doors - occupied);
      if (todayIso && day.iso < todayIso) {
        nightsPassedUnsold += open;
      } else {
        nightsStillOpen += open;
      }
    }
  }

  return { nightsStillOpen, nightsPassedUnsold };
}

/**
 * Plain reading of the published rate against what guests paid, and whether
 * any nights are still for sale. Amounts stay in the table; this is the decision.
 */
export function describeRoomPriceChoice({
  publishedRate,
  agreedNightlyRate,
  nightsStillOpen,
  pricedNights,
  datesHavePassed,
}: {
  publishedRate: number | null;
  agreedNightlyRate: number | null;
  nightsStillOpen: number;
  pricedNights: number;
  datesHavePassed: boolean;
}) {
  if (pricedNights <= 0 || agreedNightlyRate === null) {
    if (datesHavePassed) {
      return "These dates have passed, and no room price was saved.";
    }
    if (nightsStillOpen > 0) {
      return "No saved room price yet. The nights still open are the ones a discount can fill.";
    }
    return "No saved room price in this range.";
  }

  if (publishedRate === null || publishedRate <= 0) {
    return "Set a published nightly rate before comparing discounts.";
  }

  const ratio = agreedNightlyRate / publishedRate;
  const above = ratio > 1.02;
  const close = ratio >= 0.95;
  const paidLine = above
    ? "Guests paid above the current published rate."
    : close
      ? "Guests paid close to the published rate."
      : ratio < 0.92
        ? "Guests paid under the published rate."
        : "Guests paid a little under the published rate.";

  if (datesHavePassed) {
    return `These dates have passed. ${paidLine}`;
  }

  if (nightsStillOpen <= 0) {
    if (!close && !above) {
      return "Every night still ahead is sold. Guests paid under the published rate, so the next gap can stay closer to the published rate.";
    }
    return `Every night still ahead is sold. ${paidLine}`;
  }

  if (above) {
    return "Guests paid above the current published rate, and nights are still open. Raise the published rate before discounting the empty nights.";
  }
  if (close) {
    return "Guests paid close to the published rate, and nights are still open. A short discount on the empty nights can fill them.";
  }
  if (ratio < 0.92) {
    return "Guests already paid under the published rate, and nights are still open. Check the empty dates before lowering the published rate again.";
  }
  return "Guests paid a little under the published rate, and nights are still open.";
}

function attentionKindOrder(kind: StaffInsightsAttention["kind"]) {
  if (kind === "unpaid-stayed") {
    return 0;
  }
  if (kind === "bank-claimed") {
    return 1;
  }
  return 2;
}

function soldPercentOf(nightsSold: number, nightsAvailable: number) {
  if (nightsAvailable <= 0) {
    return null;
  }
  return Math.min(100, Math.round((nightsSold / nightsAvailable) * 100));
}

function websiteSourceLabel(source: BookingSource | null) {
  if (!source) {
    return "Website";
  }
  return BOOKING_SOURCE_LABELS[source];
}

function channelSourceLabel(block: StaffRoomBlock) {
  if (block.bookingSource) {
    return BOOKING_SOURCE_LABELS[block.bookingSource];
  }
  return block.channelLabel?.trim() || "Channel";
}

function bumpSource(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function buildRangeDays(rangeStart: string, rangeEnd: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const date = new Date(`${cursor}T00:00:00`);
    days.push({
      iso: cursor,
      date,
      inCurrentMonth: true,
    });
    cursor = addIsoDay(cursor, 1);
  }
  return days;
}

function formatRangeLabel(fromIso: string, toIso: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const from = formatter.format(new Date(`${fromIso}T00:00:00`));
  const to = formatter.format(new Date(`${toIso}T00:00:00`));
  if (fromIso === toIso) {
    return from;
  }
  return `${from} – ${to}`;
}

export function buildStaffInsightsReport({
  year,
  month,
  fromIso,
  toIso,
  rooms,
  bookings,
  channelBlocks,
  monthBlocks = [],
  todayIso,
}: {
  year?: number;
  month?: number;
  /** Inclusive start of the reporting window (defaults to calendar month). */
  fromIso?: string;
  /** Inclusive end of the reporting window (defaults to calendar month). */
  toIso?: string;
  rooms: Room[];
  bookings: StaffBooking[];
  channelBlocks: StaffRoomBlock[];
  /** Full window blocks; channel stays merge in, non-channel closes reduce capacity. */
  monthBlocks?: StaffRoomBlock[];
  promotions?: RoomPromotionRate[];
  rateOverrides?: Map<string, number>;
  /**
   * Nights after this date are booked but not yet earned. The staff page
   * passes today in Thailand. Tests omit it and treat the range as finished.
   */
  todayIso?: string;
}): StaffInsightsReport {
  const resolvedYear = year ?? Number((fromIso ?? "1970-01-01").slice(0, 4));
  const resolvedMonth =
    month ?? Number((fromIso ?? "1970-01-01").slice(5, 7));
  const monthLabel = formatCalendarMonthLabel(resolvedYear, resolvedMonth);

  const monthBounds = getCalendarMonthBounds(resolvedYear, resolvedMonth);
  const rangeStart = fromIso ?? monthBounds.monthStart;
  const rangeEnd = toIso ?? monthBounds.monthEnd;

  const channelStays = [
    ...channelBlocks.filter(isChannelReservation),
    ...monthBlocks.filter(isChannelReservation),
  ];
  // Dedupe by database id when both lists overlap.
  const channelByKey = new Map<string, StaffRoomBlock>();
  for (const stay of channelStays) {
    channelByKey.set(stay.databaseId ?? stay.id, stay);
  }
  const uniqueChannelStays = [...channelByKey.values()];
  const staffClosures = monthBlocks.filter((block) => !isChannelReservation(block));
  const calendarDays = buildRangeDays(rangeStart, rangeEnd);

  function buildRow({
    roomId,
    roomName,
    baseRate,
    availableCount,
    isUnconfigured,
  }: {
    roomId: string;
    roomName: string;
    baseRate: number;
    availableCount: number;
    isUnconfigured: boolean;
  }): StaffInsightsRoomRow {
    const roomBookings = bookings.filter((booking) => booking.roomId === roomId);
    const roomChannels = uniqueChannelStays.filter((stay) => stay.roomId === roomId);
    const sources = new Map<string, number>();
    let nightsSold = 0;
    let stayCount = 0;
    let websiteRevenue = 0;
    let bankCharge = 0;
    let earnedRoom = 0;
    let earnedBank = 0;
    let earnedPricedNights = 0;
    let unpricedNights = 0;
    let recordedStayCount = 0;
    let pricedNights = 0;
    let collected = 0;
    let collectedEarned = 0;
    let collectedBank = 0;
    let unpaid = 0;
    let unpaidEarned = 0;
    let bankClaimedUnpaid = 0;
    let refundsToSend = 0;
    const attention: StaffInsightsAttention[] = [];
    const nightsAvailable = countSellableDoorNights({
      availableCount,
      calendarDays,
      staffClosures,
      roomId,
    });

    for (const booking of roomBookings) {
      const nights = countNightsInMonth(
        booking.arrivalDate,
        booking.departureDate,
        rangeStart,
        rangeEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, websiteSourceLabel(booking.bookingSource));
      const refundOwed = Math.max(0, booking.refundDue ?? 0);
      refundsToSend += refundOwed;
      const bookingId = booking.databaseId ?? booking.id;
      if (refundOwed > 0) {
        attention.push({
          kind: "refund",
          bookingId,
          guestName: booking.guest,
          roomName,
          amount: refundOwed,
        });
      }
      // The saved total is the room price that was agreed. A 0 is a comp, not
      // a missing number, so it is not replaced with the rack rate.
      if (!hasRecordedTotal(booking.estimatedTotal)) {
        unpricedNights += nights;
        continue;
      }
      recordedStayCount += 1;
      const roomMoney = splitStayMoneyInRange({
        amount: booking.estimatedTotal,
        arrival: booking.arrivalDate,
        departure: booking.departureDate,
        rangeStart,
        rangeEnd,
        todayIso,
      });
      websiteRevenue += roomMoney.inRange;
      earnedRoom += roomMoney.earned;
      const earnedEnd =
        !todayIso || todayIso >= rangeEnd
          ? rangeEnd
          : todayIso < rangeStart
            ? null
            : todayIso;
      earnedPricedNights += earnedEnd
        ? countNightsInMonth(
            booking.arrivalDate,
            booking.departureDate,
            rangeStart,
            earnedEnd,
          )
        : 0;
      let chargeInRange = 0;
      let chargeEarned = 0;
      if (booking.depositPaid && booking.stripePaymentIntentId && booking.estimatedTotal > 0) {
        const charge = calculateStripeChargeAmount(booking.estimatedTotal).surcharge;
        const chargeMoney = splitStayMoneyInRange({
          amount: charge,
          arrival: booking.arrivalDate,
          departure: booking.departureDate,
          rangeStart,
          rangeEnd,
          todayIso,
        });
        bankCharge += chargeMoney.inRange;
        earnedBank += chargeMoney.earned;
        chargeInRange = chargeMoney.inRange;
        chargeEarned = chargeMoney.earned;
      }
      pricedNights += nights;
      const stayInRange = roomMoney.inRange + chargeInRange;
      const stayEarned = roomMoney.earned + chargeEarned;
      if (booking.depositPaid) {
        collected += stayInRange;
        collectedEarned += stayEarned;
        collectedBank += chargeInRange;
      } else {
        unpaid += roomMoney.inRange;
        unpaidEarned += roomMoney.earned;
        if (booking.bankTransferClaimed && roomMoney.inRange > 0) {
          bankClaimedUnpaid += roomMoney.inRange;
          attention.push({
            kind: "bank-claimed",
            bookingId,
            guestName: booking.guest,
            roomName,
            amount: roomMoney.inRange,
          });
        } else if (roomMoney.earned > 0) {
          attention.push({
            kind: "unpaid-stayed",
            bookingId,
            guestName: booking.guest,
            roomName,
            amount: roomMoney.earned,
          });
        }
      }
    }

    for (const stay of roomChannels) {
      const nights = countNightsInMonth(
        stay.startDate,
        stay.endDate,
        rangeStart,
        rangeEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, channelSourceLabel(stay));
      // No OTA selling price is stored. Quoting our own rate would invent revenue.
      unpricedNights += nights;
    }

    const estimatedRevenue = websiteRevenue + bankCharge;
    const earnedRevenue = earnedRoom + earnedBank;
    const unearnedRevenue = estimatedRevenue - earnedRevenue;
    // A removed room type has no capacity left to compare against, so its nights
    // are not overbooking.
    const nightsOverCapacity = isUnconfigured
      ? 0
      : Math.max(0, nightsSold - nightsAvailable);
    const publishedRate = isUnconfigured ? null : baseRate;
    const agreedNightlyRate = pricedNights > 0 ? websiteRevenue / pricedNights : null;
    const doorNights = isUnconfigured
      ? { nightsStillOpen: 0, nightsPassedUnsold: 0 }
      : countUnsoldDoorNights({
          rooms: [{ id: roomId, availableCount }],
          calendarDays,
          staffClosures,
          bookings: roomBookings,
          channelStays: roomChannels,
          todayIso,
        });
    const datesHavePassed = todayIso
      ? calendarDays.every((day) => day.iso < todayIso)
      : false;

    return {
      roomId,
      roomName,
      nightsSold,
      nightsAvailable,
      soldPercent: soldPercentOf(nightsSold, nightsAvailable),
      nightsOverCapacity,
      stayCount,
      websiteRevenue,
      bankCharge,
      earnedRoomRevenue: earnedRoom,
      earnedBankCharge: earnedBank,
      earnedPricedNights,
      channelRevenue: 0,
      estimatedRevenue,
      earnedRevenue,
      unearnedRevenue,
      unpricedNights,
      recordedStayCount,
      isUnconfigured,
      sources: [...sources.entries()]
        .map(([label, stays]) => ({ label, stays }))
        .sort((a, b) => b.stays - a.stays || a.label.localeCompare(b.label)),
      publishedRate,
      pricedNights,
      agreedNightlyRate,
      nightsStillOpen: doorNights.nightsStillOpen,
      priceCue: isUnconfigured
        ? ""
        : describeRoomPriceChoice({
            publishedRate,
            agreedNightlyRate,
            nightsStillOpen: doorNights.nightsStillOpen,
            pricedNights,
            datesHavePassed,
          }),
      collected,
      collectedEarned,
      collectedBankCharge: collectedBank,
      unpaid,
      unpaidEarned,
      bankClaimedUnpaid,
      refundsToSend,
      attention,
    } satisfies StaffInsightsRoomRow;
  }

  const rows = rooms.map((room) =>
    buildRow({
      roomId: room.id,
      roomName: room.name,
      baseRate: room.rate,
      availableCount: room.availableCount,
      isUnconfigured: false,
    }),
  );

  // booking_requests.room_id has no foreign key, so removing a room type leaves
  // its past stays behind. Those stays still earned money; report them under the
  // name they were sold as instead of dropping them out of the totals.
  const configuredRoomIds = new Set(rooms.map((room) => room.id));
  const retiredRooms = new Map<string, string>();
  for (const booking of bookings) {
    if (configuredRoomIds.has(booking.roomId) || retiredRooms.has(booking.roomId)) {
      continue;
    }
    if (
      countNightsInMonth(
        booking.arrivalDate,
        booking.departureDate,
        rangeStart,
        rangeEnd,
      ) > 0
    ) {
      retiredRooms.set(booking.roomId, booking.room?.trim() || booking.roomId);
    }
  }

  for (const [roomId, roomName] of retiredRooms) {
    rows.push(
      buildRow({
        roomId,
        roomName,
        baseRate: 0,
        availableCount: 0,
        isUnconfigured: true,
      }),
    );
  }

  rows.sort(
    (a, b) =>
      b.nightsSold - a.nightsSold ||
      b.estimatedRevenue - a.estimatedRevenue ||
      a.roomName.localeCompare(b.roomName),
  );

  const estimatedRevenue = rows.reduce((sum, row) => sum + row.estimatedRevenue, 0);
  const nightsSold = rows.reduce((sum, row) => sum + row.nightsSold, 0);
  const nightsAvailable = rows.reduce((sum, row) => sum + row.nightsAvailable, 0);
  const nightsOverCapacity = rows.reduce(
    (sum, row) => sum + row.nightsOverCapacity,
    0,
  );
  // Removed room types contribute nights with no capacity behind them, which
  // would read as overbooking. Occupancy compares only what is still sellable;
  // money above still counts every night.
  const nightsSoldInCapacity = rows.reduce(
    (sum, row) => (row.isUnconfigured ? sum : sum + row.nightsSold),
    0,
  );

  const earnedRoomRevenue = rows.reduce((sum, row) => sum + row.earnedRoomRevenue, 0);
  const earnedPricedNights = rows.reduce((sum, row) => sum + row.earnedPricedNights, 0);
  const totals = {
    nightsSold,
    stayCount: rows.reduce((sum, row) => sum + row.stayCount, 0),
    websiteRevenue: rows.reduce((sum, row) => sum + row.websiteRevenue, 0),
    bankCharge: rows.reduce((sum, row) => sum + row.bankCharge, 0),
    earnedRoomRevenue,
    earnedBankCharge: rows.reduce((sum, row) => sum + row.earnedBankCharge, 0),
    channelRevenue: 0,
    estimatedRevenue,
    earnedRevenue: rows.reduce((sum, row) => sum + row.earnedRevenue, 0),
    unearnedRevenue: rows.reduce((sum, row) => sum + row.unearnedRevenue, 0),
    unpricedNights: rows.reduce((sum, row) => sum + row.unpricedNights, 0),
    averageNightlyRate:
      earnedPricedNights > 0 ? earnedRoomRevenue / earnedPricedNights : null,
    recordedStayCount: rows.reduce((sum, row) => sum + row.recordedStayCount, 0),
    nightsSoldInCapacity,
    nightsAvailable,
    nightsOverCapacity,
    soldPercent: soldPercentOf(nightsSoldInCapacity, nightsAvailable),
    ...countUnsoldDoorNights({
      rooms,
      calendarDays,
      staffClosures,
      bookings,
      channelStays: uniqueChannelStays,
      todayIso,
    }),
  };
  const collected = rows.reduce((sum, row) => sum + row.collected, 0);
  const collectedEarned = rows.reduce((sum, row) => sum + row.collectedEarned, 0);
  const accounts = {
    collected,
    collectedEarned,
    collectedAhead: collected - collectedEarned,
    collectedBankCharge: rows.reduce((sum, row) => sum + row.collectedBankCharge, 0),
    unpaid: rows.reduce((sum, row) => sum + row.unpaid, 0),
    unpaidEarned: rows.reduce((sum, row) => sum + row.unpaidEarned, 0),
    bankClaimedUnpaid: rows.reduce((sum, row) => sum + row.bankClaimedUnpaid, 0),
    refundsToSend: rows.reduce((sum, row) => sum + row.refundsToSend, 0),
  };
  const attention = rows
    .flatMap((row) => row.attention)
    .sort(
      (a, b) =>
        attentionKindOrder(a.kind) - attentionKindOrder(b.kind) ||
        b.amount - a.amount ||
        a.guestName.localeCompare(b.guestName),
    );

  return {
    year: resolvedYear,
    month: resolvedMonth,
    monthLabel,
    rangeLabel: formatRangeLabel(rangeStart, rangeEnd),
    monthStart: rangeStart,
    monthEnd: rangeEnd,
    rooms: rows,
    totals,
    accounts,
    attention,
    revenueNote:
      "Earned money is the saved room price for nights in this range that have already happened, plus the card bank charge on those nights. The bank charge is not part of the room price. Nights still ahead are not earned yet. Booking-channel nights have no saved price, so they are left out of the money. A stay saved at 0 stays at 0.",
  };
}
