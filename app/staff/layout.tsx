import type { ReactNode } from "react";
import "@/app/staff-ops.css";
import "@/app/staff-calendar.css";

/**
 * Staff route segment layout — keeps ops + calendar CSS off the guest root bundle.
 * Page-level CSS (passcode, sold, promotions, etc.) still imports where needed.
 */
export default function StaffLayout({ children }: { children: ReactNode }) {
  return children;
}
