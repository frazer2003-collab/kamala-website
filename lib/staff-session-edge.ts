import type { StaffCalendarAccess } from "@/lib/supabase";

export const STAFF_SESSION_COOKIE_NAME = "kamala_staff_session";
export const STAFF_SENSITIVE_COOKIE_NAME = "kamala_staff_sensitive";

export type StaffSession = {
  calendarAccess: StaffCalendarAccess;
  subject: string;
};

export function hasStaffAuthConfig() {
  return Boolean(process.env.STAFF_ADMIN_PASSWORD && process.env.STAFF_SESSION_SECRET);
}

export function getStaffSessionSecret() {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing STAFF_SESSION_SECRET");
  }

  return secret;
}

function base64UrlDecodeToString(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padLength);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeStaffSessionPayload(
  payload: string,
): (StaffSession & { exp: number }) | null {
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
    const parsed = JSON.parse(base64UrlDecodeToString(payload)) as {
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

export function safeCompareStrings(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function signStaffSessionPayloadEdge(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function readStaffSessionFromTokenEdge(
  token: string | undefined,
): Promise<StaffSession | null> {
  if (!token || !hasStaffAuthConfig()) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const session = decodeStaffSessionPayload(payload);
  if (!session || session.exp < Date.now()) {
    return null;
  }

  const expected = await signStaffSessionPayloadEdge(payload, getStaffSessionSecret());
  if (!safeCompareStrings(signature, expected)) {
    return null;
  }

  return {
    calendarAccess: session.calendarAccess,
    subject: session.subject,
  };
}
