import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getStaffSessionSecret, hasStaffAuthConfig } from "@/lib/staff-session-edge";

export const STAFF_PORTAL_COOKIE_NAME = "kamala_desk_portal";
export type DeskPortalKind = "bills" | "laundry";

const PORTAL_MAX_AGE_SECONDS = 12 * 60 * 60;

export function getDeskPortalPasscode(kind: DeskPortalKind) {
  if (kind === "bills") {
    return process.env.STAFF_PORTAL_BILLS_PASSCODE?.trim() || "bills";
  }
  return process.env.STAFF_PORTAL_LAUNDRY_PASSCODE?.trim() || "sheets";
}

function safeCompare(left: string, right: string) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function verifyDeskPortalPasscode(kind: DeskPortalKind, input: string) {
  if (!hasStaffAuthConfig()) return false;
  const expected = getDeskPortalPasscode(kind);
  const normalized = input.trim();
  if (!normalized) return false;
  return safeCompare(normalized, expected);
}

function sign(payload: string) {
  return createHmac("sha256", getStaffSessionSecret()).update(payload).digest("base64url");
}

export function createDeskPortalToken(kind: DeskPortalKind) {
  const payload = Buffer.from(
    JSON.stringify({
      kind,
      exp: Date.now() + PORTAL_MAX_AGE_SECONDS * 1000,
    }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readDeskPortalFromToken(
  token: string | undefined,
): { kind: DeskPortalKind } | null {
  if (!token || !hasStaffAuthConfig()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = sign(payload);
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      kind?: unknown;
      exp?: unknown;
    };
    if (parsed.kind !== "bills" && parsed.kind !== "laundry") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { kind: parsed.kind };
  } catch {
    return null;
  }
}

export async function getDeskPortalSession() {
  const jar = await cookies();
  return readDeskPortalFromToken(jar.get(STAFF_PORTAL_COOKIE_NAME)?.value);
}

export async function setDeskPortalCookie(kind: DeskPortalKind) {
  const jar = await cookies();
  jar.set(STAFF_PORTAL_COOKIE_NAME, createDeskPortalToken(kind), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_MAX_AGE_SECONDS,
  });
}

export async function clearDeskPortalCookie() {
  const jar = await cookies();
  jar.delete(STAFF_PORTAL_COOKIE_NAME);
}

