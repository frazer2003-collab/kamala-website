import { NextResponse } from "next/server";
import {
  buildRoomIcalExport,
  getRoomByIcalExportToken,
} from "@/lib/room-ical";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const room = await getRoomByIcalExportToken(token);

  if (!room) {
    return new NextResponse("Calendar not found.", { status: 404 });
  }

  const calendar = await buildRoomIcalExport(
    room.id,
    room.short_name || room.name || "Room",
  );
  const safeName = (room.short_name || room.name || "room")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
