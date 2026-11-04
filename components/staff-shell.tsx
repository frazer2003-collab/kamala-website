import type { ReactNode } from "react";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffSensitiveUnlockJanitor } from "@/components/staff-sensitive-unlock-janitor";
import { StaffSessionIdleGuard } from "@/components/staff-session-idle";
import {
  StaffSidebar,
  type StaffNavCurrent,
} from "@/components/staff-sidebar";

type StaffShellProps = {
  current: StaffNavCurrent;
  children: ReactNode;
};

export function StaffShell({ current, children }: StaffShellProps) {
  return (
    <StaffBusyRoot>
      <StaffSensitiveUnlockJanitor />
      <main className="staff-shell">
        <StaffSidebar current={current} />
        {children}
      </main>
      <StaffSessionIdleGuard />
    </StaffBusyRoot>
  );
}
