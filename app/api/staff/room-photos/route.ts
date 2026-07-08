import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { uploadRoomPhoto } from "@/lib/room-photo-upload";
import { STAFF_SESSION_COOKIE_NAME, verifyStaffSessionToken } from "@/lib/staff-auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;

  if (!verifyStaffSessionToken(token)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  const formData = await request.formData();
  const roomId = String(formData.get("room-id") ?? "").trim();
  const photo = formData.get("photo");

  if (!roomId) {
    return NextResponse.json({ error: "Missing room id." }, { status: 400 });
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  const result = await uploadRoomPhoto(roomId, photo);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ url: result.url });
}
