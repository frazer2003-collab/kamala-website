import { bookingOccupiesDay } from "@/lib/calendar";
import { stayNeedsRoomAssignment } from "@/lib/room-units";

export type StaffHomeStay = {
  arrivalDate: string;
  departureDate: string;
  roomUnitId?: string | null;
};

export type StaffHomeChannelStay = {
  startDate: string;
  endDate: string;
  roomUnitId?: string | null;
};

export type StaffHomeTodaySummary = {
  arriving: number;
  departing: number;
  inHouse: number;
};

export function summarizeStaffHomeToday({
  bookings,
  channelStays = [],
  todayIso,
}: {
  bookings: StaffHomeStay[];
  channelStays?: StaffHomeChannelStay[];
  todayIso: string;
}): StaffHomeTodaySummary {
  let arriving = 0;
  let departing = 0;
  let inHouse = 0;

  for (const booking of bookings) {
    if (booking.arrivalDate === todayIso) {
      arriving += 1;
    }
    if (booking.departureDate === todayIso) {
      departing += 1;
    }
    if (bookingOccupiesDay(booking, todayIso)) {
      inHouse += 1;
    }
  }

  for (const stay of channelStays) {
    if (stay.startDate === todayIso) {
      arriving += 1;
    }
    if (stay.endDate === todayIso) {
      departing += 1;
    }
    if (
      bookingOccupiesDay(
        { arrivalDate: stay.startDate, departureDate: stay.endDate },
        todayIso,
      )
    ) {
      inHouse += 1;
    }
  }

  return { arriving, departing, inHouse };
}

/** Confirmed/channel stays still on or after today that need a door number. */
export function countUnassignedDoors({
  bookings,
  channelStays = [],
  knownUnitIds,
  todayIso,
}: {
  bookings: StaffHomeStay[];
  channelStays?: StaffHomeChannelStay[];
  knownUnitIds: ReadonlySet<string>;
  todayIso: string;
}) {
  let count = 0;

  for (const booking of bookings) {
    if (booking.departureDate <= todayIso) {
      continue;
    }
    if (stayNeedsRoomAssignment(booking, knownUnitIds)) {
      count += 1;
    }
  }

  for (const stay of channelStays) {
    if (stay.endDate <= todayIso) {
      continue;
    }
    if (stayNeedsRoomAssignment(stay, knownUnitIds)) {
      count += 1;
    }
  }

  return count;
}

export function staffHomeTodayHref(todayIso: string) {
  const month = todayIso.slice(0, 7);
  const params = new URLSearchParams({
    month,
    from: todayIso,
    to: todayIso,
  });
  return `/staff/calendar?${params.toString()}`;
}

export function staffHomeUnassignedHref(todayIso: string) {
  const month = todayIso.slice(0, 7);
  const params = new URLSearchParams({
    month,
    from: todayIso,
  });
  return `/staff/calendar?${params.toString()}`;
}
