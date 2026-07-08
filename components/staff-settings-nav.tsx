import Link from "next/link";

type StaffSettingsNavProps = {
  current: "general" | "rooms" | "tours";
};

export function StaffSettingsNav({ current }: StaffSettingsNavProps) {
  return (
    <nav aria-label="Settings sections" className="staff-settings-nav">
      <Link aria-current={current === "general" ? "page" : undefined} href="/staff/settings">
        General
      </Link>
      <Link aria-current={current === "rooms" ? "page" : undefined} href="/staff/settings/rooms">
        Rooms
      </Link>
      <Link aria-current={current === "tours" ? "page" : undefined} href="/staff/settings/tours">
        Tours
      </Link>
    </nav>
  );
}
