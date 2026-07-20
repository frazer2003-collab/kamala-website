"use client";

import { useFormStatus } from "react-dom";
import { logoutStaff } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--quiet" disabled={pending} type="submit">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function StaffLogoutForm() {
  return (
    <form action={logoutStaff} className="staff-sidebar__logout">
      <StaffFormBusyBridge message="Signing out…" />
      <LogoutSubmit />
    </form>
  );
}
