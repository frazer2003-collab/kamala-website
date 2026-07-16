"use server";

import {
  clearStaffSessionCookie,
  hasStaffAuthConfig,
  requireStaffSession,
  setStaffSessionCookie,
  verifyAdminCredentials,
} from "@/lib/staff-auth";
import { isValidStaffNotificationEmail } from "@/lib/staff-notification-emails";
import {
  toPropertySettingsRow,
  type PropertySettingsInput,
} from "@/lib/property-settings";
import {
  normalizeCalendarColors,
} from "@/lib/calendar-colors";
import {
  createRoomId,
  isRoomTone,
  MAX_ROOM_TYPES,
  ROOM_TONES,
} from "@/lib/room-catalog";
import { deleteHeroImageStorageObject, getStoredHeroImage } from "@/lib/hero-image-upload";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";
import { deletePropertyGalleryStorageObject } from "@/lib/property-gallery-upload";
import { deleteTourPhotoStorageObject, resolveTourPhotosFromForm } from "@/lib/tour-photo-upload";
import { MAX_TOURS } from "@/lib/tour-catalog";
import { getNextTourSortOrder, getTourCount } from "@/lib/tours";
import { resolveRoomPhotosFromForm } from "@/lib/room-photo-upload";
import {
  isValidIcalImportUrl,
  syncRoomIcalFeed,
  syncRoomIcalFeedsForRoom,
} from "@/lib/room-ical";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCache,
} from "@/lib/public-cache";
import { ALL_ROOMS_PROMOTION_ID } from "@/lib/room-promotion-constants";

export type StaffLoginState = {
  error?: string;
};

export type StaffSettingsState = {
  error?: string;
  success?: string;
};

export type StaffPromotionState = {
  error?: string;
  success?: string;
};

export type StaffRoomState = {
  error?: string;
  success?: string;
};

export type StaffGalleryState = {
  error?: string;
  success?: string;
};

export type StaffTourState = {
  error?: string;
  success?: string;
};

function parseHouseRules(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseAmenities(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeStaffPath(value: string) {
  if (!value.startsWith("/staff") || value.startsWith("/staff/login")) {
    return "/staff";
  }

  return value;
}

export async function loginStaff(
  _prevState: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  if (!hasStaffAuthConfig()) {
    return {
      error: "Staff login is not configured yet. Add STAFF_ADMIN_PASSWORD and STAFF_SESSION_SECRET.",
    };
  }

  const username = getValue(formData, "username");
  const password = getValue(formData, "password");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  if (!verifyAdminCredentials(username, password)) {
    return { error: "That username or password did not match." };
  }

  await setStaffSessionCookie();
  redirect(safeStaffPath(getValue(formData, "next")));
}

export async function logoutStaff() {
  await clearStaffSessionCookie();
  redirect("/staff/login");
}

export async function addStaffNotificationEmail(
  _prevState: StaffSettingsState,
  formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const email = getValue(formData, "email").toLowerCase();
  const label = getValue(formData, "label") || null;

  if (!isValidStaffNotificationEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase.from("staff_notification_emails").insert({
    email,
    label,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That email is already on the list." };
    }

    if (error.code === "42P01") {
      return {
        error: "Run supabase/migrate-staff-emails.sql in Supabase before adding emails.",
      };
    }

    return { error: "Could not save that email. Try again." };
  }

  revalidatePath("/staff/settings");
  return { success: `${email} will receive booking notifications.` };
}

export async function removeStaffNotificationEmail(formData: FormData) {
  await requireStaffSession();

  const emailId = getValue(formData, "email-id");
  if (!emailId || !hasStaffSupabaseConfig()) {
    redirect("/staff/settings");
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("staff_notification_emails").delete().eq("id", emailId);

  revalidatePath("/staff/settings");
  redirect("/staff/settings");
}

export async function addRoomPromotion(
  _prevState: StaffPromotionState,
  formData: FormData,
): Promise<StaffPromotionState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const promotionId = getValue(formData, "promotion-id");
  const roomId = getValue(formData, "room-id");
  const startDate = getValue(formData, "start-date");
  const endDate = getValue(formData, "end-date");
  const percentOff = Number.parseInt(getValue(formData, "percent-off"), 10);
  const label = getValue(formData, "label") || null;

  if (!roomId || !startDate || !endDate) {
    return { error: "Choose a room and date range." };
  }

  if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 90) {
    return { error: "Enter a discount between 1% and 90%." };
  }

  if (endDate < startDate) {
    return { error: "Last night cannot be before the first night." };
  }

  const supabase = createStaffSupabaseClient();

  if (promotionId) {
    if (roomId === ALL_ROOMS_PROMOTION_ID) {
      return { error: "Edit one room at a time, or remove and add a new all-rooms discount." };
    }

    const { error } = await supabase
      .from("room_promotions")
      .update({
        room_id: roomId,
        start_date: startDate,
        end_date: endDate,
        percent_off: percentOff,
        label,
      })
      .eq("id", promotionId);

    if (error) {
      return { error: "Could not update that discount. Try again." };
    }

    revalidatePublicCache(PUBLIC_CACHE_TAGS.publicPromotions);
    revalidatePath("/staff/promotions");
    revalidatePath("/staff/calendar");
    revalidatePath("/");
    redirect("/staff/promotions?updated=1");
  }

  let roomIds = [roomId];

  if (roomId === ALL_ROOMS_PROMOTION_ID) {
    const { data: rooms, error: roomsError } = await supabase.from("rooms").select("id");

    if (roomsError || !rooms?.length) {
      return { error: "Add at least one room before creating a discount." };
    }

    roomIds = rooms.map((room) => room.id);
  }

  const { error } = await supabase.from("room_promotions").insert(
    roomIds.map((id) => ({
      room_id: id,
      start_date: startDate,
      end_date: endDate,
      percent_off: percentOff,
      label,
    })),
  );

  if (error) {
    if (error.code === "42P01") {
      return {
        error: "Run supabase/migrate-room-promotions.sql in Supabase before adding discounts.",
      };
    }

    if (
      error.message?.includes("percent_off") ||
      error.message?.includes("nightly_rate")
    ) {
      return {
        error:
          "Run supabase/migrate-promotion-percent.sql in Supabase to switch promotions to percentage discounts.",
      };
    }

    return { error: "Could not save that discount. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicPromotions);
  revalidatePath("/staff/promotions");
  revalidatePath("/staff/calendar");
  revalidatePath("/");
  return {
    success:
      roomIds.length > 1
        ? `Discount saved for all ${roomIds.length} room types. Guests see the sale price on those nights.`
        : "Discount saved. Guests see the sale price on those nights.",
  };
}

export async function removeRoomPromotion(formData: FormData) {
  await requireStaffSession();

  const promotionId = getValue(formData, "promotion-id");
  if (!promotionId || !hasStaffSupabaseConfig()) {
    redirect("/staff/promotions");
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("room_promotions").delete().eq("id", promotionId);

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicPromotions);
  revalidatePath("/staff/promotions");
  revalidatePath("/staff/calendar");
  revalidatePath("/");
  redirect("/staff/promotions");
}

export async function updatePropertySettings(
  _prevState: StaffSettingsState,
  formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const currency = getValue(formData, "currency");
  const input: PropertySettingsInput = {
    propertyName: getValue(formData, "property-name") || "Guesthouse",
    propertyTagline: getValue(formData, "property-tagline") || "Guesthouse",
    contactEmail: getValue(formData, "contact-email") || null,
    contactPhone: getValue(formData, "contact-phone") || null,
    addressLine: getValue(formData, "address-line") || null,
    checkInFrom: getValue(formData, "check-in-from") || "3:00 pm",
    checkInUntil: getValue(formData, "check-in-until") || "8:00 pm",
    quietHours: getValue(formData, "quiet-hours") || "10:00 pm",
    currency: currency === "usd" ? "usd" : "thb",
    allowPayOnArrival: false,
    houseRules: parseHouseRules(getValue(formData, "house-rules")),
    cancellationPolicy: getValue(formData, "cancellation-policy"),
    privacyPolicy: getValue(formData, "privacy-policy"),
    termsSummary: getValue(formData, "terms-summary"),
    lineUrl: getValue(formData, "line-url") || null,
    whatsappUrl: getValue(formData, "whatsapp-url") || null,
    calendarColors: normalizeCalendarColors({
      available: getValue(formData, "calendar-color-available"),
      closed: getValue(formData, "calendar-color-closed"),
      booking: getValue(formData, "calendar-color-booking"),
      soldOut: getValue(formData, "calendar-color-sold-out"),
    }),
  };

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("property_settings")
    .upsert({ id: "default", ...toPropertySettingsRow(input) });

  if (error) {
    if (error.code === "42P01") {
      return {
        error: "Run supabase/migrate-property-settings.sql in Supabase before saving property settings.",
      };
    }

    return { error: "Could not save property settings. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertySettings);
  revalidatePath("/");
  revalidatePath("/staff/settings");
  revalidatePath("/staff/calendar");
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/cancellation");
  return { success: "Property settings saved." };
}

export async function removeHeroImage(
  _prevState: StaffSettingsState,
  _formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const stored = await getStoredHeroImage();
  if (stored.storagePath) {
    const storageResult = await deleteHeroImageStorageObject(stored.storagePath);
    if ("error" in storageResult) {
      return { error: storageResult.error };
    }
  }

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("property_settings")
    .update({
      hero_image_url: null,
      hero_image_storage_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) {
    return { error: "Could not remove the homepage photo. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertySettings);
  revalidatePath("/");
  revalidatePath("/staff/settings");
  return { success: "Homepage background photo removed." };
}

export async function updateRoomDetails(
  _prevState: StaffRoomState,
  formData: FormData,
): Promise<StaffRoomState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const roomId = getValue(formData, "room-id");
  const rate = Number.parseInt(getValue(formData, "rate"), 10);
  const availableCount = Number.parseInt(getValue(formData, "available-count"), 10);
  const name = getValue(formData, "name");
  const shortName = getValue(formData, "short-name");
  const sleeps = getValue(formData, "sleeps");
  const outlook = getValue(formData, "outlook");
  const summary = getValue(formData, "summary");
  const amenities = parseAmenities(getValue(formData, "amenities"));

  if (!roomId || !name || !shortName || !sleeps || !outlook || !summary) {
    return { error: "Fill in all required room fields." };
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return { error: "Enter a valid nightly rate." };
  }

  if (!Number.isFinite(availableCount) || availableCount < 0) {
    return { error: "Enter how many rooms of this type you have (0 or more)." };
  }

  const photos = resolveRoomPhotosFromForm(formData);

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      name,
      short_name: shortName,
      rate,
      available_count: availableCount,
      sleeps,
      outlook,
      summary,
      amenities,
      image_url: photos.imageUrl,
      gallery_urls: photos.galleryUrls,
    })
    .eq("id", roomId);

  if (error) {
    return { error: "Could not save this room. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicRooms);
  revalidatePath("/");
  revalidatePath("/staff/settings/rooms");
  revalidatePath("/staff/calendar");
  return { success: `${shortName} room updated.` };
}

async function getRoomCount(supabase: ReturnType<typeof createStaffSupabaseClient>) {
  const { count, error } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true });

  if (error || count === null) {
    return 0;
  }

  return count;
}

async function getNextRoomSortOrder(supabase: ReturnType<typeof createStaffSupabaseClient>) {
  const { data } = await supabase
    .from("rooms")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}

export async function addRoom(
  _prevState: StaffRoomState,
  formData: FormData,
): Promise<StaffRoomState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const supabase = createStaffSupabaseClient();
  const roomCount = await getRoomCount(supabase);

  if (roomCount >= MAX_ROOM_TYPES) {
    return { error: `You can add up to ${MAX_ROOM_TYPES} room types.` };
  }

  const name = getValue(formData, "name");
  const shortName = getValue(formData, "short-name");
  const rate = Number.parseInt(getValue(formData, "rate"), 10);
  const availableCountRaw = Number.parseInt(getValue(formData, "available-count"), 10);
  const availableCount =
    Number.isFinite(availableCountRaw) && availableCountRaw >= 0 ? availableCountRaw : 1;
  const sleeps = getValue(formData, "sleeps") || "Sleeps 2";
  const outlook = getValue(formData, "outlook") || "Room details";
  const summary =
    getValue(formData, "summary") || "A comfortable room for your stay.";
  const tone = getValue(formData, "tone");
  const selectedTone = isRoomTone(tone) ? tone : ROOM_TONES[roomCount % ROOM_TONES.length];

  if (!name || !shortName) {
    return { error: "Enter a room name and short label." };
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return { error: "Enter a valid nightly rate." };
  }

  const sortOrder = await getNextRoomSortOrder(supabase);
  const { error } = await supabase.from("rooms").insert({
    id: createRoomId(shortName),
    name,
    short_name: shortName,
    rate,
    sleeps,
    outlook,
    available_count: availableCount,
    summary,
    amenities: ["Breakfast included"],
    tone: selectedTone,
    image_url: null,
    gallery_urls: [],
    sort_order: sortOrder,
  });

  if (error) {
    return { error: "Could not add this room. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicRooms);
  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/settings/rooms");
  return { success: `${shortName} added to your room list.` };
}

export async function removeRoom(formData: FormData) {
  await requireStaffSession();

  const roomId = getValue(formData, "room-id");
  if (!roomId || !hasStaffSupabaseConfig()) {
    redirect("/staff/settings/rooms");
  }

  const supabase = createStaffSupabaseClient();
  const { count } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (count && count > 0) {
    redirect("/staff/settings/rooms?error=has-bookings");
  }

  await supabase.from("room_promotions").delete().eq("room_id", roomId);
  await supabase.from("room_blocks").delete().eq("room_id", roomId);
  await supabase.from("rooms").delete().eq("id", roomId);

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicRooms);
  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/settings/rooms");
  redirect("/staff/settings/rooms?removed=1");
}

export async function removePropertyGalleryPhoto(
  _prevState: StaffGalleryState,
  formData: FormData,
): Promise<StaffGalleryState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const photoId = getValue(formData, "photo-id");
  if (!photoId) {
    return { error: "Missing photo id." };
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("property_gallery_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (error || !data) {
    return { error: "Could not find this photo." };
  }

  const storageResult = await deletePropertyGalleryStorageObject(data.storage_path);
  if ("error" in storageResult) {
    return { error: storageResult.error };
  }

  const { error: deleteError } = await supabase
    .from("property_gallery_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    return { error: "Could not remove this photo. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertyGallery);
  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");
  return { success: "Photo removed. Guests no longer see it on the gallery page." };
}

export async function movePropertyGalleryPhoto(
  _prevState: StaffGalleryState,
  formData: FormData,
): Promise<StaffGalleryState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const photoId = getValue(formData, "photo-id");
  const direction = getValue(formData, "direction");

  if (!photoId || (direction !== "up" && direction !== "down")) {
    return { error: "Could not reorder that photo." };
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("property_gallery_photos")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return { error: "Could not reorder that photo." };
  }

  const index = data.findIndex((row) => row.id === photoId);
  if (index < 0) {
    return { error: "Could not find this photo." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= data.length) {
    return {};
  }

  const current = data[index];
  const neighbor = data[swapIndex];

  const { error: firstError } = await supabase
    .from("property_gallery_photos")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", current.id);

  if (firstError) {
    return { error: "Could not reorder that photo. Try again." };
  }

  const { error: secondError } = await supabase
    .from("property_gallery_photos")
    .update({ sort_order: current.sort_order })
    .eq("id", neighbor.id);

  if (secondError) {
    await supabase
      .from("property_gallery_photos")
      .update({ sort_order: current.sort_order })
      .eq("id", current.id);
    return { error: "Could not reorder that photo. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertyGallery);
  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");
  return { success: "Photo order updated." };
}

export async function addTour(
  _prevState: StaffTourState,
  formData: FormData,
): Promise<StaffTourState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const tourCount = await getTourCount();
  if (tourCount >= MAX_TOURS) {
    return { error: `You can add up to ${MAX_TOURS} tours.` };
  }

  const title = getValue(formData, "title");
  const summary = getValue(formData, "summary");
  const durationLabel = getValue(formData, "duration-label") || null;
  const priceLabel = getValue(formData, "price-label") || null;

  if (!title || !summary) {
    return { error: "Enter a title and summary." };
  }

  const sortOrder = await getNextTourSortOrder();
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase.from("tours").insert({
    title,
    summary,
    duration_label: durationLabel,
    price_label: priceLabel,
    sort_order: sortOrder,
  });

  if (error) {
    if (error.code === "42P01") {
      return { error: "Run supabase/migrate-tours.sql in Supabase before adding tours." };
    }

    return { error: "Could not add this tour. Try again." };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicTours);
  revalidatePath("/tours");
  revalidatePath("/staff/settings/tours");
  return { success: `${title} added. Upload photos on the card below.` };
}

export async function updateTour(
  _prevState: StaffTourState,
  formData: FormData,
): Promise<StaffTourState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const tourId = getValue(formData, "tour-id");
  const title = getValue(formData, "title");
  const summary = getValue(formData, "summary");
  const durationLabel = getValue(formData, "duration-label") || null;
  const priceLabel = getValue(formData, "price-label") || null;
  const linkUrl = getValue(formData, "link-url") || null;
  const linkLabel = getValue(formData, "link-label") || "Enquire";
  const photos = resolveTourPhotosFromForm(formData);

  if (!tourId || !title || !summary) {
    return { error: "Fill in the required tour fields." };
  }

  const supabase = createStaffSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("tours")
    .select("image_storage_path, gallery_urls")
    .eq("id", tourId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Could not find this tour." };
  }

  const nextImageUrl = photos.imageUrl;
  const nextStoragePath = nextImageUrl
    ? photos.imageStoragePath || existing.image_storage_path
    : null;

  if (existing.image_storage_path && existing.image_storage_path !== nextStoragePath) {
    await deleteTourPhotoStorageObject(existing.image_storage_path);
  }

  const removedGalleryUrls = (existing.gallery_urls ?? []).filter(
    (url) => !photos.galleryUrls.includes(url),
  );

  const { error } = await supabase
    .from("tours")
    .update({
      title,
      summary,
      duration_label: durationLabel,
      price_label: priceLabel,
      link_url: linkUrl,
      link_label: linkLabel,
      image_url: nextImageUrl,
      image_storage_path: nextStoragePath,
      gallery_urls: photos.galleryUrls,
    })
    .eq("id", tourId);

  if (error) {
    if (error.message?.includes("gallery_urls")) {
      return {
        error: "Run supabase/migrate-tour-gallery.sql in Supabase before saving tour photos.",
      };
    }

    return { error: "Could not save this tour. Try again." };
  }

  for (const url of removedGalleryUrls) {
    const storagePath = url.split("/storage/v1/object/public/property-gallery/")[1];
    if (storagePath) {
      await deleteTourPhotoStorageObject(storagePath);
    }
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicTours);
  revalidatePath("/tours");
  revalidatePath("/staff/settings/tours");
  return { success: `${title} updated.` };
}

export async function removeTour(formData: FormData) {
  await requireStaffSession();

  const tourId = getValue(formData, "tour-id");
  if (!tourId || !hasStaffSupabaseConfig()) {
    redirect("/staff/settings/tours");
  }

  const supabase = createStaffSupabaseClient();
  const { data } = await supabase
    .from("tours")
    .select("image_storage_path")
    .eq("id", tourId)
    .maybeSingle();

  if (data?.image_storage_path) {
    await deleteTourPhotoStorageObject(data.image_storage_path);
  }

  await supabase.from("tours").delete().eq("id", tourId);

  revalidatePublicCache(PUBLIC_CACHE_TAGS.publicTours);
  revalidatePath("/tours");
  revalidatePath("/staff/settings/tours");
  redirect("/staff/settings/tours?removed=1");
}

export async function addRoomIcalFeed(
  _prevState: StaffRoomState,
  formData: FormData,
): Promise<StaffRoomState> {
  await requireStaffSession();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const roomId = getValue(formData, "room-id");
  const label = getValue(formData, "label");
  const importUrl = getValue(formData, "import-url");

  if (!roomId || !label) {
    return { error: "Choose a channel name for this calendar feed." };
  }

  if (!isValidIcalImportUrl(importUrl)) {
    return { error: "Enter a valid https calendar URL from Airbnb, Booking.com, or Expedia." };
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("room_ical_feeds")
    .insert({
      room_id: roomId,
      label,
      import_url: importUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "42P01") {
      return {
        error: "Run supabase/migrate-room-ical.sql in Supabase before adding calendar feeds.",
      };
    }

    return { error: "Could not save this calendar feed. Try again." };
  }

  const syncResult = await syncRoomIcalFeed(data.id);

  revalidatePath("/staff/calendar");
  revalidatePath("/staff/settings/rooms");

  if (!syncResult.ok) {
    return {
      success: `${label} saved, but the first sync failed: ${syncResult.error}`,
    };
  }

  return {
    success: `${label} connected. Imported ${syncResult.imported} reservation${syncResult.imported === 1 ? "" : "s"}.`,
  };
}

export async function removeRoomIcalFeed(formData: FormData) {
  await requireStaffSession();

  const feedId = getValue(formData, "feed-id");
  const roomId = getValue(formData, "room-id");

  if (!feedId || !hasStaffSupabaseConfig()) {
    redirect("/staff/settings/rooms");
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("room_ical_feeds").delete().eq("id", feedId);

  revalidatePath("/staff/calendar");
  revalidatePath("/staff/settings/rooms");
  redirect(roomId ? `/staff/settings/rooms?room=${encodeURIComponent(roomId)}` : "/staff/settings/rooms");
}

export async function syncRoomIcalFeedsAction(formData: FormData) {
  await requireStaffSession();

  const roomId = getValue(formData, "room-id");

  if (!roomId || !hasStaffSupabaseConfig()) {
    redirect("/staff/settings/rooms");
  }

  const results = await syncRoomIcalFeedsForRoom(roomId);
  const failed = results.find((result) => !result.ok);

  revalidatePath("/staff/calendar");
  revalidatePath("/");
  revalidatePath("/staff/settings/rooms");

  if (failed) {
    redirect(
      `/staff/settings/rooms?room=${encodeURIComponent(roomId)}&ical-error=${encodeURIComponent(failed.error ?? "sync-failed")}`,
    );
  }

  const imported = results.reduce((total, result) => total + result.imported, 0);
  redirect(
    `/staff/settings/rooms?room=${encodeURIComponent(roomId)}&ical-synced=${imported}`,
  );
}
