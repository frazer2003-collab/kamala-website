import { NextResponse } from "next/server";
import { buildRoomIcalExport, getRoomByIcalExportToken } from "@/lib/room-ical";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const room = await getRoomByIcalExportToken(token);

  if (!room) {
    return new NextResponse("Calendar not found.", { status: 404 });
  }

  const calendar = await buildRoomIcalExport(room.id, room.name);

  const safeName = (room.short_name || room.name || "calendar")
    .replace(/[^\w.\- ]+/g, "_")
    .trim()
    .slice(0, 80);

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || "calendar"}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
