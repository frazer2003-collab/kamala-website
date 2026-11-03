import { NextResponse } from "next/server";
import { purgeAbandonedCheckouts } from "@/lib/abandoned-checkout";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Clears unfinished Thai bank / QR (and card) checkouts older than 24 hours. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeAbandonedCheckouts();
  if (result.deleted > 0) {
    revalidatePath("/");
    revalidatePath("/staff");
    revalidatePath("/staff/calendar");
  }

  return NextResponse.json({
    deleted: result.deleted,
    error: result.error,
  });
}
