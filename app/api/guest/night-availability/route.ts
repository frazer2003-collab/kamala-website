import { NextResponse } from "next/server";
import { getPropertyTodayIso } from "@/lib/calendar";
import { getGuestNightAvailability } from "@/lib/guest-night-availability";
import {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  clampGuestNightAvailabilityQuery,
} from "@/lib/guest-night-availability-shared";
import { getPublicRooms } from "@/lib/rooms";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null): value is string {
  return Boolean(value && ISO_DATE.test(value));
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
  const clamped = clampGuestNightAvailabilityQuery({
    fromRaw,
    toRaw,
    todayIso: today,
  });

  if (!clamped.ok) {
    if (clamped.reason === "beyond-horizon") {
      return NextResponse.json(
        { status: "ok", nights: {} },
        {
          headers: {
            "Cache-Control": "private, max-age=60",
          },
        },
      );
    }

    if (clamped.reason === "too-long") {
      return NextResponse.json(
        {
          error: `Range cannot exceed ${GUEST_NIGHT_AVAILABILITY_MAX_DAYS} days.`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "to must be on or after from." },
      { status: 400 },
    );
  }

  const rooms = await getPublicRooms();
  const result = await getGuestNightAvailability(
    rooms,
    clamped.fromIso,
    clamped.toIso,
  );

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
