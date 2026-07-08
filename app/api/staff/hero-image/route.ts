import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deleteHeroImageStorageObject,
  getStoredHeroImage,
  uploadHeroImage,
} from "@/lib/hero-image-upload";
import { STAFF_SESSION_COOKIE_NAME, verifyStaffSessionToken } from "@/lib/staff-auth";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { PUBLIC_CACHE_TAGS, revalidatePublicCache } from "@/lib/public-cache";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;

  if (!verifyStaffSessionToken(token)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  const uploaded = await uploadHeroImage(photo);
  if ("error" in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 400 });
  }

  const previous = await getStoredHeroImage();
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("property_settings")
    .update({
      hero_image_url: uploaded.url,
      hero_image_storage_path: uploaded.storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) {
    return NextResponse.json({ error: "Could not save the homepage photo. Try again." }, { status: 500 });
  }

  if (previous.storagePath && previous.storagePath !== uploaded.storagePath) {
    await deleteHeroImageStorageObject(previous.storagePath);
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertySettings);
  revalidatePath("/");
  revalidatePath("/staff/settings");

  return NextResponse.json({ url: uploaded.url });
}
