import { NextResponse } from "next/server";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  getGuestNightAvailability,
} from "@/lib/guest-night-availability";
import { addIsoDays } from "@/lib/room-day-inventory";
import { getPublicRooms } from "@/lib/rooms";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

function countInclusiveDays(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  if (!isIsoDate(fromRaw) || !isIsoDate(toRaw)) {
    return NextResponse.json(
      { error: "Provide from and to as YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const today = getPropertyTodayIso();
  const fromIso = fromRaw < today ? today : fromRaw;
  const toIso = toRaw;

  if (toIso < fromIso) {
    return NextResponse.json(
      { error: "to must be on or after from." },
      { status: 400 },
    );
  }

  if (countInclusiveDays(fromIso, toIso) > GUEST_NIGHT_AVAILABILITY_MAX_DAYS) {
    return NextResponse.json(
      {
        error: `Range cannot exceed ${GUEST_NIGHT_AVAILABILITY_MAX_DAYS} days.`,
      },
      { status: 400 },
    );
  }

  // Soft upper bound: don't serve far-future windows beyond today + max.
  const latest = addIsoDays(today, GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
  const clampedTo = toIso > latest ? latest : toIso;
  if (clampedTo < fromIso) {
    return NextResponse.json(
      { status: "ok", nights: {} },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  }

  const rooms = await getPublicRooms();
  const result = await getGuestNightAvailability(rooms, fromIso, clampedTo);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
