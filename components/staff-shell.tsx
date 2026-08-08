import type { ReactNode } from "react";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffSessionIdleGuard } from "@/components/staff-session-idle";
import { StaffSidebar } from "@/components/staff-sidebar";
import { clearStaffSensitiveUnlockOutsideScope } from "@/lib/staff-auth";

type StaffShellProps = {
  current:
    | "requests"
    | "calendar"
    | "reservations"
    | "sold"
    | "promotions"
    | "gallery"
    | "settings";
  children: ReactNode;
};

export async function StaffShell({ current, children }: StaffShellProps) {
  await clearStaffSensitiveUnlockOutsideScope(
    current === "sold" || current === "settings" ? current : "other",
  );

  return (
    <StaffBusyRoot>
      <main className="staff-shell">
        <StaffSidebar current={current} />
        {children}
      </main>
      <StaffSessionIdleGuard />
    </StaffBusyRoot>
  );
}
