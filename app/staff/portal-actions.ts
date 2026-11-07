"use server";

import { redirect } from "next/navigation";
import {
  clearDeskPortalCookie,
  setDeskPortalCookie,
  type DeskPortalKind,
  verifyDeskPortalPasscode,
} from "@/lib/desk-portal";
import { hasStaffAuthConfig } from "@/lib/staff-auth";

export async function loginDeskPortal(formData: FormData) {
  if (!hasStaffAuthConfig()) {
    throw new Error("Staff auth is not configured.");
  }
  const kindRaw = String(formData.get("portal") ?? "").trim();
  const kind: DeskPortalKind = kindRaw === "laundry" ? "laundry" : "bills";
  const passcode = String(formData.get("passcode") ?? "");
  if (!verifyDeskPortalPasscode(kind, passcode)) {
    redirect(`/staff/portal/login?portal=${kind}&error=passcode`);
  }
  await setDeskPortalCookie(kind);
  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith(`/staff/portal/${kind}`)) {
    redirect(next);
  }
  redirect(kind === "laundry" ? "/staff/portal/laundry" : "/staff/portal/bills");
}

export async function logoutDeskPortal() {
  await clearDeskPortalCookie();
  redirect("/staff/portal/login");
}
