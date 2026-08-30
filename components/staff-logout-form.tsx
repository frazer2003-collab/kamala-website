"use client";

import { useTransition } from "react";
import { logoutStaff } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { clearStaffIdleActivity } from "@/lib/staff-session-idle";

function LogoutSubmit({ pending }: { pending: boolean }) {
  return (
    <button className="button button--quiet" disabled={pending} type="submit">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function StaffLogoutForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="staff-sidebar__logout"
      data-busy-message="Signing out…"
      onSubmit={(event) => {
        event.preventDefault();
        clearStaffIdleActivity();
        startTransition(() => {
          void logoutStaff();
        });
      }}
    >
      <StaffFormBusyBridge message="Signing out…" />
      <LogoutSubmit pending={pending} />
    </form>
  );
}
