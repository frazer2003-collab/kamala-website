import Link from "next/link";
import { StaffLogoutForm } from "@/components/staff-logout-form";

type StaffSidebarProps = {
  current: "requests" | "calendar" | "promotions" | "gallery" | "settings";
};

export function StaffSidebar({ current }: StaffSidebarProps) {
  return (
    <aside className="staff-sidebar" aria-label="Staff navigation">
      <Link className="brand brand--compact" href="/">
        <span className="brand__mark" aria-hidden="true">
          K
        </span>
        <span>
          <strong>Kamala</strong>
          <small>Staff</small>
        </span>
      </Link>
      <nav className="staff-nav">
        <Link aria-current={current === "requests" ? "page" : undefined} href="/staff">
          Requests
        </Link>
        <Link
          aria-current={current === "calendar" ? "page" : undefined}
          href="/staff/calendar"
        >
          Calendar
        </Link>
        <Link
          aria-current={current === "promotions" ? "page" : undefined}
          href="/staff/promotions"
        >
          Discounts
        </Link>
        <Link aria-current={current === "gallery" ? "page" : undefined} href="/staff/gallery">
          Gallery
        </Link>
        <Link
          aria-current={current === "settings" ? "page" : undefined}
          href="/staff/settings"
        >
          Settings
        </Link>
      </nav>
      <StaffLogoutForm />
    </aside>
  );
}
