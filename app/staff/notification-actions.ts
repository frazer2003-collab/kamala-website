"use server";

import { markStaffDeskNotificationRead } from "@/lib/staff-desk-notifications";
import { requireStaffSession } from "@/lib/staff-auth";

export async function markNotificationRead(id: string) {
  await requireStaffSession();
  await markStaffDeskNotificationRead(id);
}
