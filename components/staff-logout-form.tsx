"use client";

import { useTransition } from "react";
import { logoutStaff } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { useStaffLocale } from "@/components/staff-locale";
import { clearStaffIdleActivity } from "@/lib/staff-session-idle";

function LogoutSubmit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button className="button button--quiet" disabled={pending} type="submit">
      {pending ? `${label}…` : label}
    </button>
  );
}

export function StaffLogoutForm() {
  const { t } = useStaffLocale();
  const [pending, startTransition] = useTransition();
  const label = t("nav.logout");

  return (
    <form
      className="staff-sidebar__logout"
      data-busy-message={label}
      onSubmit={(event) => {
        event.preventDefault();
        clearStaffIdleActivity();
        startTransition(() => {
          void logoutStaff();
        });
      }}
    >
      <StaffFormBusyBridge message={label} />
      <LogoutSubmit label={label} pending={pending} />
    </form>
  );
}
