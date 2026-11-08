"use server";

import { revalidatePath } from "next/cache";
import { getPropertyTodayIso } from "@/lib/calendar";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { createStaffSupabaseClient } from "@/lib/supabase";

export async function markStayHousekeepingCleaned(formData: FormData) {
  await requireStaffCalendarWrite();
  const bookingId = String(formData.get("booking-id") ?? "").trim();
  if (!bookingId) {
    return;
  }

  const todayIso = getPropertyTodayIso();
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("booking_requests")
    .update({ housekeeping_cleaned_on: todayIso })
    .eq("id", bookingId);

  if (error) {
    console.error("markStayHousekeepingCleaned", error.message);
  }

  revalidatePath("/staff/home");
  revalidatePath("/staff/calendar");
}
