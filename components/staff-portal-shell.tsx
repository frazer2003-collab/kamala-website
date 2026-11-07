"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { logoutDeskPortal } from "@/app/staff/portal-actions";
import { useStaffLocale } from "@/components/staff-locale";
import { StaffSessionIdleGuard } from "@/components/staff-session-idle";
import type { DeskPortalKind } from "@/lib/desk-portal";
import { STAFF_IDLE_TIMEOUT_MS } from "@/lib/staff-session-idle";
import "@/app/staff-desk.css";

const PORTAL_IDLE_STORAGE_KEY = "kamala_portal_last_activity";

export function StaffPortalShell({
  kind,
  children,
}: {
  kind: DeskPortalKind;
  children: ReactNode;
}) {
  const { t } = useStaffLocale();
  const brandKind =
    kind === "laundry" ? t("portal.brandSheets") : t("portal.brandBills");

  return (
    <main className="staff-shell staff-shell--portal">
      <StaffSessionIdleGuard
        onLogout={logoutDeskPortal}
        storageKey={PORTAL_IDLE_STORAGE_KEY}
        surfaceLabel={t("portal.deskPortal")}
        timeoutMs={STAFF_IDLE_TIMEOUT_MS}
      />
      <aside className="staff-sidebar staff-sidebar--portal" aria-label={t("portal.navLabel")}>
        <div className="staff-sidebar__top">
          <Link className="brand brand--compact" href={`/staff/portal/${kind}`}>
            <span className="brand__mark" aria-hidden="true">
              K
            </span>
            <span className="staff-sidebar__brand-text">
              <strong>Kamala</strong>
              <small>{brandKind}</small>
            </span>
          </Link>
        </div>
        <form action={logoutDeskPortal} className="staff-sidebar__logout">
          <button className="button button--quiet" type="submit">
            {t("nav.logout")}
          </button>
        </form>
      </aside>
      {children}
    </main>
  );
}
