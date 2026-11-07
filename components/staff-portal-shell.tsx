import Link from "next/link";
import type { ReactNode } from "react";
import { logoutDeskPortal } from "@/app/staff/portal-actions";
import type { DeskPortalKind } from "@/lib/desk-portal";
import "@/app/staff-desk.css";

export function StaffPortalShell({
  kind,
  children,
}: {
  kind: DeskPortalKind;
  children: ReactNode;
}) {
  return (
    <main className="staff-shell staff-shell--portal">
      <aside className="staff-sidebar staff-sidebar--portal" aria-label="Portal">
        <div className="staff-sidebar__top">
          <Link className="brand brand--compact" href={`/staff/portal/${kind}`}>
            <span className="brand__mark" aria-hidden="true">
              K
            </span>
            <span className="staff-sidebar__brand-text">
              <strong>Kamala</strong>
              <small>{kind === "laundry" ? "Laundry" : "Bills"}</small>
            </span>
          </Link>
        </div>
        <form action={logoutDeskPortal} className="staff-sidebar__logout">
          <button className="button button--quiet" type="submit">
            Sign out
          </button>
        </form>
      </aside>
      {children}
    </main>
  );
}
