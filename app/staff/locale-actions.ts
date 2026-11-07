"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  STAFF_LOCALE_COOKIE,
  parseStaffLocale,
  type StaffLocale,
} from "@/lib/staff-i18n";
import { requireStaffSession } from "@/lib/staff-auth";

export async function setStaffLocale(locale: StaffLocale) {
  await requireStaffSession();
  const next = parseStaffLocale(locale);
  const jar = await cookies();
  jar.set(STAFF_LOCALE_COOKIE, next, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/staff", "layout");
}

export async function toggleStaffLocale() {
  await requireStaffSession();
  const jar = await cookies();
  const current = parseStaffLocale(jar.get(STAFF_LOCALE_COOKIE)?.value);
  const next: StaffLocale = current === "en" ? "th" : "en";
  jar.set(STAFF_LOCALE_COOKIE, next, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/staff", "layout");
  return next;
}
