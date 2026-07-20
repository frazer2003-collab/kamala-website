import type { ReactNode } from "react";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffSidebar } from "@/components/staff-sidebar";

type StaffShellProps = {
  current: "requests" | "calendar" | "promotions" | "gallery" | "settings";
  children: ReactNode;
};

export function StaffShell({ current, children }: StaffShellProps) {
  return (
    <StaffBusyRoot>
      <main className="staff-shell">
        <StaffSidebar current={current} />
        {children}
      </main>
    </StaffBusyRoot>
  );
}
