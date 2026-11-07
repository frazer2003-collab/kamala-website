import type { ReactNode } from "react";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffSensitiveUnlockJanitor } from "@/components/staff-sensitive-unlock-janitor";
import { StaffSessionIdleGuard } from "@/components/staff-session-idle";
import {
  StaffSidebar,
  type StaffNavCurrent,
} from "@/components/staff-sidebar";
import { getStaffLocale } from "@/lib/staff-locale-server";

type StaffShellProps = {
  current: StaffNavCurrent;
  children: ReactNode;
};

export async function StaffShell({ current, children }: StaffShellProps) {
  const locale = await getStaffLocale();

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffBusyRoot>
        <StaffSensitiveUnlockJanitor />
        <main className="staff-shell" lang={locale}>
          <StaffSidebar current={current} />
          {children}
        </main>
        <StaffSessionIdleGuard />
      </StaffBusyRoot>
    </StaffLocaleProvider>
  );
}
