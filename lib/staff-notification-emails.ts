import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type StaffCalendarAccess,
} from "@/lib/supabase";

export type StaffNotificationEmail = {
  id: string;
  email: string;
  label: string | null;
  calendarAccess: StaffCalendarAccess;
  created_at: string;
};

export type { StaffCalendarAccess };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidStaffNotificationEmail(value: string) {
  return emailPattern.test(value.trim().toLowerCase());
}

export function isStaffCalendarAccess(value: string): value is StaffCalendarAccess {
  return value === "read" || value === "read_write";
}

export function formatStaffCalendarAccess(access: StaffCalendarAccess) {
  return access === "read_write" ? "Calendar: read & write" : "Calendar: read only";
}

function mapRow(row: {
  id: string;
  email: string;
  label: string | null;
  calendar_access?: string | null;
  created_at: string;
}): StaffNotificationEmail {
  return {
    id: row.id,
    email: row.email,
    label: row.label,
    calendarAccess: row.calendar_access === "read" ? "read" : "read_write",
    created_at: row.created_at,
  };
}

export async function getStaffNotificationEmails(): Promise<StaffNotificationEmail[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .select("id, email, label, calendar_access, created_at")
    .order("created_at", { ascending: true });

  if (error || !data) {
    // Older DBs before calendar_access existed on staff emails
    const fallback = await supabase
      .from("staff_notification_emails")
      .select("id, email, label, created_at")
      .order("created_at", { ascending: true });

    if (fallback.error || !fallback.data) {
      return [];
    }

    return fallback.data.map((row) => mapRow(row));
  }

  return data.map((row) => mapRow(row));
}

export async function getStaffNotificationEmailByAddress(
  email: string,
): Promise<StaffNotificationEmail | null> {
  const normalized = email.trim().toLowerCase();
  if (!isValidStaffNotificationEmail(normalized) || !hasStaffSupabaseConfig()) {
    return null;
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .select("id, email, label, calendar_access, created_at")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data);
}

export function resolveStaffNotificationRecipients(
  emails: StaffNotificationEmail[],
  envFallback?: string | null,
): string[] {
  const writable = emails
    .filter((entry) => entry.calendarAccess === "read_write")
    .map((entry) => entry.email);

  if (writable.length > 0) {
    return writable;
  }

  // Prefer every saved staff address over silence when none are marked read/write.
  if (emails.length > 0) {
    return emails.map((entry) => entry.email);
  }

  const fallback = envFallback?.trim();
  return fallback ? [fallback] : [];
}

export async function getStaffNotificationRecipients(): Promise<string[]> {
  const emails = await getStaffNotificationEmails();
  return resolveStaffNotificationRecipients(
    emails,
    process.env.STAFF_NOTIFICATION_EMAIL,
  );
}
