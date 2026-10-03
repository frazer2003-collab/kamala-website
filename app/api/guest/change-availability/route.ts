import { NextResponse } from "next/server";
import { getPropertyTodayIso } from "@/lib/calendar";
import { getGuestNightAvailability } from "@/lib/guest-night-availability";
import {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  clampGuestNightAvailabilityQuery,
} from "@/lib/guest-night-availability-shared";
import { loadStayForChange } from "@/lib/guest-stay-change-server";
import { getPublicRooms } from "@/lib/rooms";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

/** Night map for one room type, ignoring the guest's own stay so it never blocks itself. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const roomId = searchParams.get("room") ?? "";
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  if (!isIsoDate(fromRaw) || !isIsoDate(toRaw) || !token || !roomId) {
    return NextResponse.json(
      { error: "Provide token, room, from and to." },
      { status: 400 },
    );
  }

  const stay = await loadStayForChange(token);
  if (stay.status !== "ok" || !stay.eligibility.ok) {
    return NextResponse.json({ error: "This link can’t change a stay." }, { status: 404 });
  }

  const room = (await getPublicRooms()).find((candidate) => candidate.id === roomId);
  if (!room) {
    return NextResponse.json({ error: "Unknown room." }, { status: 404 });
  }

  const clamped = clampGuestNightAvailabilityQuery({
    fromRaw,
    toRaw,
    todayIso: getPropertyTodayIso(),
  });

  if (!clamped.ok) {
    if (clamped.reason === "beyond-horizon") {
      return NextResponse.json({ status: "ok", nights: {} });
    }
    return NextResponse.json(
      {
        error:
          clamped.reason === "too-long"
            ? `Range cannot exceed ${GUEST_NIGHT_AVAILABILITY_MAX_DAYS} days.`
            : "to must be on or after from.",
      },
      { status: 400 },
    );
  }

  const result = await getGuestNightAvailability([room], clamped.fromIso, clamped.toIso, {
    excludeBookingId: stay.booking.id,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
