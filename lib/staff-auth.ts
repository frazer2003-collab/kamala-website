import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const STAFF_SESSION_COOKIE_NAME = "kamala_staff_session";
const COOKIE_NAME = STAFF_SESSION_COOKIE_NAME;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createStaffSessionToken() {
  const exp = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${exp}.${signSessionPayload(exp)}`;
}

export function verifyStaffSessionToken(token: string | undefined) {
  if (!token || !hasStaffAuthConfig()) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const exp = Number.parseInt(payload, 10);
  if (!Number.isFinite(exp) || exp < Date.now()) {
    return false;
  }

  const expected = signSessionPayload(payload);
  if (!safeCompare(signature, expected)) {
    return false;
  }

  return true;
}

export async function isStaffAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyStaffSessionToken(token);
}

export async function requireStaffSession() {
  if (!(await isStaffAuthenticated())) {
    redirect("/staff/login");
  }
}
export async function setStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createStaffSessionToken(), {
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
