import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

export type StaffNotificationEmail = {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidStaffNotificationEmail(value: string) {
  return emailPattern.test(value.trim().toLowerCase());
}

export async function getStaffNotificationEmails(): Promise<StaffNotificationEmail[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .select("id, email, label, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getStaffNotificationRecipients(): Promise<string[]> {
  const emails = await getStaffNotificationEmails();

  if (emails.length > 0) {
    return emails.map((entry) => entry.email);
  }

  const fallback = process.env.STAFF_NOTIFICATION_EMAIL?.trim();
  return fallback ? [fallback] : [];
}
