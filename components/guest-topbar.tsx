import Image from "next/image";
import Link from "next/link";
import { GuestTopbarHome } from "@/components/guest-topbar-home";
import type { PropertySettings } from "@/lib/property-settings";

type GuestTopbarProps = {
  settings: PropertySettings;
  current?: "home" | "gallery" | "tours" | "location" | "contact";
  tone?: "default" | "on-dark";
  variant?: "default" | "home";
};

export function GuestTopbar({
  settings,
  current,
  tone = "default",
  variant = "default",
}: GuestTopbarProps) {
  if (variant === "home") {
    return <GuestTopbarHome settings={settings} />;
  }

  return (
    <header
      className={tone === "on-dark" ? "topbar topbar--on-dark" : "topbar"}
      aria-label="Main navigation"
    >
      <Link className="brand brand--logo" href="/">
        <Image
          alt={settings.propertyName}
          className="brand__logo"
          height={47}
          priority
          src="/guesthouse-logo.png"
          width={70}
        />
      </Link>
      <nav className="topbar__nav" aria-label="Guest navigation">
        <Link aria-current={current === "gallery" ? "page" : undefined} href="/gallery">
          Gallery
        </Link>
        <Link aria-current={current === "location" ? "page" : undefined} href="/location">
          Location
        </Link>
        <Link aria-current={current === "contact" ? "page" : undefined} href="/contact">
          Contact
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
