import { NextResponse } from "next/server";

/**
 * Calendar export is disabled — Kamala only imports OTA bookings.
 * Old export URLs return 410 so Airbnb/Booking.com stop pulling.
 */
export async function GET() {
  return new NextResponse(
    "Calendar export is disabled. Kamala imports OTA calendars only and does not publish availability.",
    {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
