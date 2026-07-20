import { NextResponse } from "next/server";
import {
  buildRoomUnitIcalExport,
  getRoomUnitByIcalExportToken,
} from "@/lib/room-ical";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const unit = await getRoomUnitByIcalExportToken(token);

  if (!unit) {
    return new NextResponse("Calendar not found.", { status: 404 });
  }

  const calendar = await buildRoomUnitIcalExport(unit.id, `Room ${unit.number}`);
  const safeName = `room-${unit.number}`.replace(/[^\w.\-]+/g, "_").slice(0, 80);

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
