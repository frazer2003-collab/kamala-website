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
  hasPassword: boolean;
  created_at: string;
};

export type StaffLoginCredential = {
  email: string;
  calendarAccess: StaffCalendarAccess;
  passwordHash: string | null;
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
  password_hash?: string | null;
  created_at: string;
}): StaffNotificationEmail {
  return {
    id: row.id,
    email: row.email,
    label: row.label,
    calendarAccess: row.calendar_access === "read" ? "read" : "read_write",
    hasPassword: Boolean(row.password_hash),
    created_at: row.created_at,
  };
}

const staffEmailSelect =
  "id, email, label, calendar_access, password_hash, created_at" as const;
const staffEmailSelectLegacy = "id, email, label, calendar_access, created_at" as const;

export async function getStaffNotificationEmails(): Promise<StaffNotificationEmail[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .select(staffEmailSelect)
    .order("created_at", { ascending: true });

  if (error || !data) {
    // Older DBs before password_hash existed on staff emails
    const fallback = await supabase
      .from("staff_notification_emails")
      .select(staffEmailSelectLegacy)
      .order("created_at", { ascending: true });

    if (fallback.error || !fallback.data) {
      // Older DBs before calendar_access existed on staff emails
      const legacy = await supabase
        .from("staff_notification_emails")
        .select("id, email, label, created_at")
        .order("created_at", { ascending: true });

      if (legacy.error || !legacy.data) {
        return [];
      }

      return legacy.data.map((row) => mapRow(row));
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
    .select(staffEmailSelect)
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) {
    const fallback = await supabase
      .from("staff_notification_emails")
      .select(staffEmailSelectLegacy)
      .eq("email", normalized)
      .maybeSingle();

    if (fallback.error || !fallback.data) {
      return null;
    }

    return mapRow(fallback.data);
  }

  return mapRow(data);
}

export async function getStaffLoginCredential(
  email: string,
): Promise<StaffLoginCredential | null> {
  const normalized = email.trim().toLowerCase();
  if (!isValidStaffNotificationEmail(normalized) || !hasStaffSupabaseConfig()) {
    return null;
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("staff_notification_emails")
    .select("email, calendar_access, password_hash")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data) {
    const fallback = await supabase
      .from("staff_notification_emails")
      .select("email, calendar_access")
      .eq("email", normalized)
      .maybeSingle();

    if (fallback.error || !fallback.data) {
      return null;
    }

    return {
      email: fallback.data.email,
      calendarAccess: fallback.data.calendar_access === "read" ? "read" : "read_write",
      passwordHash: null,
    };
  }

  return {
    email: data.email,
    calendarAccess: data.calendar_access === "read" ? "read" : "read_write",
    passwordHash: data.password_hash ?? null,
  };
}

export async function getStaffNotificationRecipients(): Promise<string[]> {
  const emails = await getStaffNotificationEmails();
  const writable = emails
    .filter((entry) => entry.calendarAccess === "read_write")
    .map((entry) => entry.email);

  if (writable.length > 0) {
    return writable;
  }

  // No read/write staff saved yet — keep the env fallback for ops.
  if (emails.length === 0) {
    const fallback = process.env.STAFF_NOTIFICATION_EMAIL?.trim();
    return fallback ? [fallback] : [];
  }

  return [];
}
