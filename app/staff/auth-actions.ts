"use server";

import {
  clearStaffSensitiveUnlockCookie,
  clearStaffSessionCookie,
  hasStaffAuthConfig,
  requireStaffCalendarWrite,
  requireStaffSensitiveAccess,
  requireStaffSession,
  setStaffSensitiveUnlockCookie,
  setStaffSessionCookie,
  staffSensitiveScopeForPath,
  verifyAdminCredentials,
  verifyStaffEmailLogin,
  verifyStaffSensitivePasscode,
} from "@/lib/staff-auth";
import {
  isStaffCalendarAccess,
  isValidStaffNotificationEmail,
} from "@/lib/staff-notification-emails";
import {
  hashStaffPassword,
  isStaffPasswordValid,
  staffPasswordValidationMessage,
} from "@/lib/staff-password";
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

export type StaffPasscodeState = {
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
  if (
    !value.startsWith("/staff") ||
    value.startsWith("/staff/login") ||
    value.startsWith("/staff/passcode")
  ) {
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
      error:
        "Staff sign-in isn’t set up yet. Add STAFF_ADMIN_PASSWORD and STAFF_SESSION_SECRET to the environment, then reload this page.",
    };
  }

  const username = getValue(formData, "username");
  const password = getValue(formData, "password");

  if (!username || !password) {
    return { error: "Enter your username or email and password." };
  }

  if (verifyAdminCredentials(username, password)) {
    await setStaffSessionCookie({
      calendarAccess: "read_write",
      subject: "admin",
    });
    redirect(safeStaffPath(getValue(formData, "next")));
  }

  const staffCredential = await verifyStaffEmailLogin(username, password);
  if (staffCredential) {
    await setStaffSessionCookie({
      calendarAccess: staffCredential.calendarAccess,
      subject: staffCredential.email,
    });
    redirect(safeStaffPath(getValue(formData, "next")));
  }

  return {
    error: "That username or password did not match. Try again.",
  };
}

export async function logoutStaff() {
  await clearStaffSessionCookie();
  redirect("/staff/login");
}

/** Clears Finance/Settings unlock after staff leave those pages. */
export async function clearStaffSensitiveUnlockIfAway() {
  await requireStaffSession();
  await clearStaffSensitiveUnlockCookie();
}

export async function unlockStaffSensitive(
  _prevState: StaffPasscodeState,
  formData: FormData,
): Promise<StaffPasscodeState> {
  await requireStaffCalendarWrite();

  const passcode = getValue(formData, "passcode");
  if (!passcode) {
    return { error: "Enter the passcode to continue." };
  }

  if (!verifyStaffSensitivePasscode(passcode)) {
    return { error: "That passcode didn’t match. Try again." };
  }

  const nextPath = safeStaffPath(getValue(formData, "next"));
  const scope = staffSensitiveScopeForPath(nextPath);
  if (!scope) {
    return { error: "That page is not available after the passcode." };
  }

  await setStaffSensitiveUnlockCookie(scope);
  redirect(nextPath);
}

export async function addStaffNotificationEmail(
  _prevState: StaffSettingsState,
  formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSensitiveAccess("/staff/settings");

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const email = getValue(formData, "email").toLowerCase();
  const label = getValue(formData, "label") || null;
  const password = getValue(formData, "password");
  const calendarAccessRaw = getValue(formData, "calendar-access");
  const calendarAccess = isStaffCalendarAccess(calendarAccessRaw)
    ? calendarAccessRaw
    : "read_write";

  if (!isValidStaffNotificationEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!isStaffPasswordValid(password)) {
    return { error: staffPasswordValidationMessage() };
  }

  const passwordHash = await hashStaffPassword(password);

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase.from("staff_notification_emails").insert({
    email,
    label,
    calendar_access: calendarAccess,
    password_hash: passwordHash,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That email is already on the list." };
    }

    if (error.code === "42P01") {
      return {
        error: "Run supabase/schema.sql in Supabase before adding emails.",
      };
    }

    if (error.message?.includes("password_hash") || error.code === "42703") {
      return {
        error:
          "Run supabase/migrate-staff-passwords.sql in Supabase before setting staff passwords.",
      };
    }

    if (error.message?.includes("calendar_access") || error.code === "42703") {
      return {
        error:
          "Run supabase/schema.sql in Supabase before setting calendar permissions.",
      };
    }

    return { error: "Could not save that email. Try again." };
  }

  revalidatePath("/staff/settings");
  return {
    success:
      calendarAccess === "read"
        ? `${email} can view the calendar (read only). They will not get booking alerts.`
        : `${email} will get booking alerts and can edit the calendar.`,
  };
}

export async function updateStaffNotificationPassword(
  _prevState: StaffSettingsState,
  formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSensitiveAccess("/staff/settings");

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const emailId = getValue(formData, "email-id");
  const password = getValue(formData, "password");
  const confirmPassword = getValue(formData, "confirm-password");

  if (!emailId) {
    return { error: "Could not find that staff account." };
  }

  if (!isStaffPasswordValid(password)) {
    return { error: staffPasswordValidationMessage() };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords did not match. Try again." };
  }

  const passwordHash = await hashStaffPassword(password);
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .update({ password_hash: passwordHash })
    .eq("id", emailId)
    .select("email")
    .maybeSingle();

  if (error) {
    if (error.message?.includes("password_hash") || error.code === "42703") {
      return {
        error:
          "Run supabase/migrate-staff-passwords.sql in Supabase before setting staff passwords.",
      };
    }

    return { error: "Could not update that password. Try again." };
  }

  if (!data?.email) {
    return { error: "Could not find that staff account." };
  }

  revalidatePath("/staff/settings");
  return { success: `Password updated for ${data.email}.` };
}

export async function updateStaffNotificationCalendarAccess(formData: FormData) {
  await requireStaffSensitiveAccess("/staff/settings");

  const emailId = getValue(formData, "email-id");
  const calendarAccessRaw = getValue(formData, "calendar-access");

  if (!emailId || !hasStaffSupabaseConfig() || !isStaffCalendarAccess(calendarAccessRaw)) {
    redirect("/staff/settings");
  }

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("staff_notification_emails")
    .update({ calendar_access: calendarAccessRaw })
    .eq("id", emailId);

  if (error) {
    redirect("/staff/settings?error=calendar-access");
  }

  revalidatePath("/staff/settings");
  redirect("/staff/settings?saved=calendar-access");
}

export async function removeStaffNotificationEmail(formData: FormData) {
  await requireStaffSensitiveAccess("/staff/settings");

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
  await requireStaffCalendarWrite();

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
        error: "Run supabase/schema.sql in Supabase before adding discounts.",
      };
    }

    if (
      error.message?.includes("percent_off") ||
      error.message?.includes("nightly_rate")
    ) {
      return {
        error:
          "Run supabase/schema.sql in Supabase to enable percentage discounts.",
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
  await requireStaffCalendarWrite();

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

export type StaffDiscountCodeState = {
  error?: string;
  success?: string;
};

export async function addDiscountCode(
  _prevState: StaffDiscountCodeState,
  formData: FormData,
): Promise<StaffDiscountCodeState> {
  await requireStaffCalendarWrite();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    isDiscountCodeFormatValid,
    normalizeDiscountCodeInput,
  } = await import("@/lib/discount-codes");
  const rawCode = normalizeDiscountCodeInput(getValue(formData, "code"));
  const roomId = getValue(formData, "room-id");
  const validUntil = getValue(formData, "valid-until") || null;
  const maxUsesRaw = getValue(formData, "max-uses");
  const percentOff = Number.parseInt(getValue(formData, "percent-off"), 10);
  const label = getValue(formData, "label") || null;

  if (!isDiscountCodeFormatValid(rawCode)) {
    return { error: "Use 3–20 letters or numbers for the code." };
  }

  if (!roomId) {
    return { error: "Choose which rooms this code applies to." };
  }

  if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 90) {
    return { error: "Enter a discount between 1% and 90%." };
  }

  let maxUses: number | null = null;
  if (maxUsesRaw) {
    const parsedMaxUses = Number.parseInt(maxUsesRaw, 10);
    if (!Number.isFinite(parsedMaxUses) || parsedMaxUses < 1) {
      return { error: "Max uses must be at least 1, or leave blank for unlimited." };
    }
    maxUses = parsedMaxUses;
  }

  const supabase = createStaffSupabaseClient();
  let resolvedRoomId: string | null = roomId;

  if (roomId === ALL_ROOMS_PROMOTION_ID) {
    resolvedRoomId = null;
  }

  const { error } = await supabase.from("discount_codes").insert({
    code: rawCode,
    percent_off: percentOff,
    room_id: resolvedRoomId,
    valid_until: validUntil,
    max_uses: maxUses,
    label,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That code already exists. Choose another." };
    }
    if (error.code === "42P01") {
      return { error: "Run supabase/migrate-discount-codes.sql before adding codes." };
    }
    return { error: "Could not save that code. Try again." };
  }

  revalidatePath("/staff/promotions");
  return { success: `Code ${rawCode} saved. Guests can enter it at checkout.` };
}

export async function deactivateDiscountCode(formData: FormData) {
  await requireStaffCalendarWrite();

  const codeId = getValue(formData, "code-id");
  if (!codeId || !hasStaffSupabaseConfig()) {
    redirect("/staff/promotions?tab=codes");
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("discount_codes").update({ active: false }).eq("id", codeId);

  revalidatePath("/staff/promotions");
  redirect("/staff/promotions?tab=codes&updated=1");
}

export async function updatePropertySettings(
  _prevState: StaffSettingsState,
  formData: FormData,
): Promise<StaffSettingsState> {
  await requireStaffSensitiveAccess("/staff/settings");

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
    promptPayId: getValue(formData, "promptpay-id") || null,
    bankName: getValue(formData, "bank-name") || null,
    accountName: getValue(formData, "account-name") || null,
    accountNumber: getValue(formData, "account-number") || null,
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
        error: "Run supabase/schema.sql in Supabase before saving property settings.",
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
  await requireStaffSensitiveAccess("/staff/settings");

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
  await requireStaffSensitiveAccess("/staff/settings");

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
  await requireStaffSensitiveAccess("/staff/settings");

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
  await requireStaffSensitiveAccess("/staff/settings");

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
  await requireStaffCalendarWrite();

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
  await requireStaffCalendarWrite();

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

export async function reorderPropertyGalleryPhotos(
  _prevState: StaffGalleryState,
  formData: FormData,
): Promise<StaffGalleryState> {
  await requireStaffCalendarWrite();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const orderedIds = getValue(formData, "ordered-ids")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (orderedIds.length === 0) {
    return { error: "Could not save the new photo order." };
  }

  if (new Set(orderedIds).size !== orderedIds.length) {
    return { error: "Could not save the new photo order." };
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("property_gallery_photos")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    return { error: "Could not save the new photo order." };
  }

  const existingIds = data.map((row) => row.id);
  if (
    orderedIds.length !== existingIds.length ||
    orderedIds.some((id) => !existingIds.includes(id))
  ) {
    return { error: "Photo list changed. Refresh and try again." };
  }

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error: updateError } = await supabase
      .from("property_gallery_photos")
      .update({ sort_order: index })
      .eq("id", orderedIds[index]);

    if (updateError) {
      return { error: "Could not save the new photo order. Try again." };
    }
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertyGallery);
  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");
  return { success: "Photo order saved." };
}

export async function updateGalleryRoomPhotosVisibility(
  _prevState: StaffGalleryState,
  formData: FormData,
): Promise<StaffGalleryState> {
  await requireStaffCalendarWrite();

  if (!hasStaffSupabaseConfig()) {
    return { error: "Supabase is not configured yet." };
  }

  const showRoomPhotos = getValue(formData, "show-room-photos") === "1";
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("property_settings")
    .update({
      show_room_photos_on_gallery: showRoomPhotos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) {
    return {
      error: "Could not update room photo visibility. Try again in a moment.",
    };
  }

  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertySettings);
  revalidatePublicCache(PUBLIC_CACHE_TAGS.propertyGallery);
  revalidatePath("/gallery");
  revalidatePath("/staff/gallery");
  return {
    success: showRoomPhotos
      ? "Room photos will show on the guest gallery."
      : "Room photos are hidden from the guest gallery.",
  };
}

export async function addTour(
  _prevState: StaffTourState,
  formData: FormData,
): Promise<StaffTourState> {
  await requireStaffSensitiveAccess("/staff/settings");

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
      return { error: "Run supabase/schema.sql in Supabase before adding tours." };
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
  await requireStaffSensitiveAccess("/staff/settings");

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
        error: "Run supabase/schema.sql in Supabase before saving tour photos.",
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
  await requireStaffSensitiveAccess("/staff/settings");

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

