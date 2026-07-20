import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncRoomIcalFeedsByChannel } from "@/lib/room-ical";

export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
}

function parseChannel(value: string | null): "all" | "airbnb" | "booking" | "expedia" {
  if (value === "airbnb" || value === "booking" || value === "expedia" || value === "all") {
    return value;
  }
  // Default: Airbnb door calendars (requested auto-refresh cadence).
  return "airbnb";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const channel = parseChannel(new URL(request.url).searchParams.get("channel"));
  const results = await syncRoomIcalFeedsByChannel(channel);
  const synced = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok).length;

  revalidatePath("/staff/calendar");
  revalidatePath("/");

  return NextResponse.json({
    ok: failed === 0,
    channel,
    synced,
    failed,
    results,
  });
}
