import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getNextPropertyGallerySortOrder,
  getPropertyGalleryPhotoCount,
} from "@/lib/property-gallery";
import {
  MAX_PROPERTY_GALLERY_PHOTOS,
  uploadPropertyGalleryPhoto,
} from "@/lib/property-gallery-upload";
import {
  STAFF_SESSION_COOKIE_NAME,
  readStaffSessionFromToken,
  staffCanWriteCalendar,
} from "@/lib/staff-auth";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { PUBLIC_CACHE_TAGS, revalidatePublicCache } from "@/lib/public-cache";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const session = readStaffSessionFromToken(token);

  if (!session) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  if (!staffCanWriteCalendar(session)) {
    return NextResponse.json({ error: "Calendar write access required." }, { status: 403 });
  }

  const photoCount = await getPropertyGalleryPhotoCount();
  if (photoCount >= MAX_PROPERTY_GALLERY_PHOTOS) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_PROPERTY_GALLERY_PHOTOS} gallery photos.` },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  const uploaded = await uploadPropertyGalleryPhoto(photo);
  if ("error" in uploaded) {
    return NextResponse.json({ error: uploaded.error }, { status: 400 });
  }

  const sortOrder = await getNextPropertyGallerySortOrder();
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("property_gallery_photos")
    .insert({
      storage_path: uploaded.storagePath,
      url: uploaded.url,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save this photo. Try again." }, { status: 500 });
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertyGallery);
  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");

  return NextResponse.json({
    id: data.id,
    url: data.url,
    caption: data.caption,
    sortOrder: data.sort_order,
  });
}
