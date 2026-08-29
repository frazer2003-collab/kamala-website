import { cache } from "react";
import { monthsOverlappingDateRange } from "@/lib/calendar";
import { getConfirmedBookingsOverlappingRange } from "@/lib/booking-requests";
import { getPropertySettings } from "@/lib/property-settings";
import {
  buildRateLookup,
  getRoomDayRatesForMonth,
} from "@/lib/room-day-rates";
import {
  getChannelBlocksOverlappingRange,
  getStaffClosureBlocksOverlappingRange,
} from "@/lib/room-blocks";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";

export const loadStaffFinancePageData = cache(
  async (fromIso: string, toIso: string) => {
    const overlappingMonths = monthsOverlappingDateRange(fromIso, toIso);

    const [
      rooms,
      bookingsResult,
      channelsResult,
      closuresResult,
      settings,
      promotions,
      dayRatesParts,
    ] = await Promise.all([
      getStaffRooms(),
      getConfirmedBookingsOverlappingRange(fromIso, toIso),
      getChannelBlocksOverlappingRange(fromIso, toIso),
      getStaffClosureBlocksOverlappingRange(fromIso, toIso),
      getPropertySettings(),
      getStaffRoomPromotions(),
      Promise.all(
        overlappingMonths.map((entry) =>
          getRoomDayRatesForMonth({ year: entry.year, month: entry.month }),
        ),
      ),
    ]);

    return {
      rooms,
      bookingsResult,
      channelsResult,
      closuresResult,
      settings,
      promotions,
      dayRatesParts,
      rateOverrides: buildRateLookup(
        dayRatesParts.flatMap((part) => part.entries),
      ),
    };
  },
);
