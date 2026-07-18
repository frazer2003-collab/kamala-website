import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStaffNotificationEmailByAddress } from "@/lib/staff-notification-emails";
import type { StaffCalendarAccess } from "@/lib/supabase";

export const STAFF_SESSION_COOKIE_NAME = "kamala_staff_session";
const COOKIE_NAME = STAFF_SESSION_COOKIE_NAME;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type StaffSession = {
  calendarAccess: StaffCalendarAccess;
  subject: string;
};

function safeCompare(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function getSessionSecret() {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing STAFF_SESSION_SECRET");
  }

  return secret;
}

function getAdminCredentials() {
  const username = process.env.STAFF_ADMIN_USERNAME || "admin";
  const password = process.env.STAFF_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Missing STAFF_ADMIN_PASSWORD");
  }

  return { username, password };
}

export function hasStaffAuthConfig() {
  return Boolean(process.env.STAFF_ADMIN_PASSWORD && process.env.STAFF_SESSION_SECRET);
}

export function verifyAdminCredentials(inputUsername: string, inputPassword: string) {
  if (!hasStaffAuthConfig()) {
    return false;
  }

  const { username, password } = getAdminCredentials();
  return safeCompare(inputUsername, username) && safeCompare(inputPassword, password);
}

export function verifySharedStaffPassword(inputPassword: string) {
  if (!hasStaffAuthConfig()) {
    return false;
  }

  const { password } = getAdminCredentials();
  return safeCompare(inputPassword, password);
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodeSessionPayload(session: StaffSession & { exp: number }) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSessionPayload(payload: string): (StaffSession & { exp: number }) | null {
  // Legacy tokens: payload is only the expiry milliseconds.
  if (/^\d+$/.test(payload)) {
    const exp = Number.parseInt(payload, 10);
    if (!Number.isFinite(exp)) {
      return null;
    }

    return {
      exp,
      calendarAccess: "read_write",
      subject: "admin",
    };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
      calendarAccess?: unknown;
      subject?: unknown;
    };

    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }

    if (parsed.calendarAccess !== "read" && parsed.calendarAccess !== "read_write") {
      return null;
    }

    if (typeof parsed.subject !== "string" || !parsed.subject) {
      return null;
    }

    return {
      exp: parsed.exp,
      calendarAccess: parsed.calendarAccess,
      subject: parsed.subject,
    };
  } catch {
    return null;
  }
}

export function createStaffSessionToken(session: StaffSession) {
  const payload = encodeSessionPayload({
    ...session,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });
  return `${payload}.${signSessionPayload(payload)}`;
}

export function readStaffSessionFromToken(token: string | undefined): StaffSession | null {
  if (!token || !hasStaffAuthConfig()) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const session = decodeSessionPayload(payload);
  if (!session || session.exp < Date.now()) {
    return null;
  }

  const expected = signSessionPayload(payload);
  if (!safeCompare(signature, expected)) {
    return null;
  }

  return {
    calendarAccess: session.calendarAccess,
    subject: session.subject,
  };
}

export function verifyStaffSessionToken(token: string | undefined) {
  return Boolean(readStaffSessionFromToken(token));
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return readStaffSessionFromToken(token);
}

export async function isStaffAuthenticated() {
  return Boolean(await getStaffSession());
}

export async function requireStaffSession() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }
}

export async function requireStaffSessionDetails(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }

  if (session.subject === "admin") {
    return session;
  }

  const entry = await getStaffNotificationEmailByAddress(session.subject);
  if (!entry) {
    await clearStaffSessionCookie();
    redirect("/staff/login");
  }

  return {
    subject: entry.email,
    calendarAccess: entry.calendarAccess,
  };
}

export function staffCanWriteCalendar(session: StaffSession | null | undefined) {
  return session?.calendarAccess === "read_write";
}

export async function requireStaffCalendarWrite() {
  const session = await requireStaffSessionDetails();
  if (!staffCanWriteCalendar(session)) {
    redirect("/staff/calendar?error=calendar-read-only");
  }

  return session;
}

export async function setStaffSessionCookie(session: StaffSession) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createStaffSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
