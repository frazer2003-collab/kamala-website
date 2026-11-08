"use server";

import {
  markAllStaffDeskNotificationsRead,
  markStaffDeskNotificationRead,
} from "@/lib/staff-desk-notifications";
import { requireStaffSession } from "@/lib/staff-auth";

export async function markNotificationRead(id: string) {
  await requireStaffSession();
  if (id.startsWith("live:")) return;
  await markStaffDeskNotificationRead(id);
}

export async function markAllNotificationsRead() {
  await requireStaffSession();
  await markAllStaffDeskNotificationsRead();
}
