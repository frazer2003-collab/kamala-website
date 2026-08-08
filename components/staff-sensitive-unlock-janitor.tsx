"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clearStaffSensitiveUnlockIfAway } from "@/app/staff/auth-actions";

function isSensitiveStaffPath(pathname: string) {
  return (
    pathname === "/staff/sold" ||
    pathname.startsWith("/staff/sold/") ||
    pathname.startsWith("/staff/settings") ||
    pathname.startsWith("/staff/passcode")
  );
}

/**
 * Clears Finance/Settings passcode unlock after leaving those areas.
 * Must run via a Server Action — cookie deletes are not allowed during RSC render.
 */
export function StaffSensitiveUnlockJanitor() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPathRef.current === pathname) {
      return;
    }
    lastPathRef.current = pathname;

    if (isSensitiveStaffPath(pathname)) {
      return;
    }

    void clearStaffSensitiveUnlockIfAway();
  }, [pathname]);

  return null;
}
