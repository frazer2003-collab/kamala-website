import Link from "next/link";
import type { PropertySettings } from "@/lib/property-settings";

type GuestTopbarProps = {
  settings: PropertySettings;
  current?: "home" | "gallery" | "tours";
};

export function GuestTopbar({ settings, current }: GuestTopbarProps) {
  const brandInitial = settings.propertyName.trim().charAt(0).toUpperCase() || "K";

  return (
    <header className="topbar" aria-label="Main navigation">
      <Link className="brand" href="/">
        <span className="brand__mark" aria-hidden="true">
          {brandInitial}
        </span>
        <span>
          <strong>{settings.propertyName}</strong>
          <small>{settings.propertyTagline}</small>
        </span>
      </Link>
      <nav className="topbar__nav" aria-label="Guest navigation">
        <Link aria-current={current === "gallery" ? "page" : undefined} href="/gallery">
          Gallery
        </Link>
        <Link href="/#rooms">Rooms</Link>
        <Link aria-current={current === "tours" ? "page" : undefined} href="/tours">
          Tours
        </Link>
        {settings.lineUrl ? (
          <a href={settings.lineUrl} rel="noopener noreferrer" target="_blank">
            LINE
          </a>
        ) : null}
        {settings.whatsappUrl ? (
          <a href={settings.whatsappUrl} rel="noopener noreferrer" target="_blank">
            WhatsApp
          </a>
        ) : null}
      </nav>
    </header>
  );
}
