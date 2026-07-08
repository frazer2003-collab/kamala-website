import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { PUBLIC_CACHE_TAGS, revalidatePublicCache } from "@/lib/public-cache";
import { MAX_TOUR_GALLERY_PHOTOS } from "@/lib/tour-catalog";
import { deleteTourPhotoStorageObject, uploadTourPhoto } from "@/lib/tour-photo-upload";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { STAFF_SESSION_COOKIE_NAME, verifyStaffSessionToken } from "@/lib/staff-auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value;

  if (!verifyStaffSessionToken(token)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  const formData = await request.formData();
  const tourId = String(formData.get("tour-id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "cover").trim();
  const photo = formData.get("photo");

  if (!tourId) {
    return NextResponse.json({ error: "Missing tour id." }, { status: 400 });
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  const result = await uploadTourPhoto(tourId, photo);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = createStaffSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("tours")
    .select("image_storage_path, gallery_urls")
    .eq("id", tourId)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Could not find this tour." }, { status: 404 });
  }

  if (kind === "gallery") {
    const galleryUrls = [...(existing.gallery_urls ?? []), result.url];
    if (galleryUrls.length > MAX_TOUR_GALLERY_PHOTOS) {
      await deleteTourPhotoStorageObject(result.storagePath);
      return NextResponse.json({
        error: `You can add up to ${MAX_TOUR_GALLERY_PHOTOS} extra photos per tour.`,
      }, { status: 400 });
    }

    const { error } = await supabase
      .from("tours")
      .update({ gallery_urls: galleryUrls })
      .eq("id", tourId);

    if (error) {
      await deleteTourPhotoStorageObject(result.storagePath);
      return NextResponse.json({ error: "Could not save this photo. Try again." }, { status: 500 });
    }

    revalidatePublicCache(PUBLIC_CACHE_TAGS.publicTours);
    revalidatePath("/tours");
    revalidatePath("/staff/settings/tours");

    return NextResponse.json({
      url: result.url,
      storagePath: result.storagePath,
      galleryUrls,
    });
  }

  if (existing.image_storage_path && existing.image_storage_path !== result.storagePath) {
    await deleteTourPhotoStorageObject(existing.image_storage_path);
  }

  const { error } = await supabase
    .from("tours")
    .update({
      image_url: result.url,
      image_storage_path: result.storagePath,
    })
    .eq("id", tourId);

  if (error) {
    await deleteTourPhotoStorageObject(result.storagePath);
    return NextResponse.json({ error: "Could not save this photo. Try again." }, { status: 500 });
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicTours);
  revalidatePath("/tours");
  revalidatePath("/staff/settings/tours");

  return NextResponse.json({
    url: result.url,
    storagePath: result.storagePath,
  });
}
