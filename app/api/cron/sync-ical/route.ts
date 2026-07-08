import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncAllRoomIcalFeeds } from "@/lib/room-ical";

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const results = await syncAllRoomIcalFeeds();
  const synced = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok).length;

  revalidatePath("/staff/calendar");
  revalidatePath("/");

  return NextResponse.json({
    ok: failed === 0,
    synced,
    failed,
    results,
  });
}
