import Link from "next/link";
import type { PropertySettings } from "@/lib/property-settings";
import { formatPropertyTagline } from "@/lib/property-brand";

export function SiteFooter({ settings }: { settings: PropertySettings }) {
  const tagline = formatPropertyTagline(settings.propertyName, settings.propertyTagline);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <strong>
            {settings.propertyName}
            {tagline ? ` · ${tagline}` : null}
          </strong>
          {settings.addressLine ? <p>{settings.addressLine}</p> : null}
          {settings.contactPhone || settings.contactEmail ? (
            <p>
              {settings.contactPhone ? <span>{settings.contactPhone}</span> : null}
              {settings.contactPhone && settings.contactEmail ? " · " : null}
              {settings.contactEmail ? <span>{settings.contactEmail}</span> : null}
            </p>
          ) : null}
        </div>
        <nav aria-label="Guest pages and legal" className="site-footer__nav">
          <Link href="/gallery">Gallery</Link>
          <Link href="/#rooms">Rooms</Link>
          <Link href="/tours">Tours</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cancellation">Cancellation</Link>
          <Link className="site-footer__staff" href="/staff/login">
            Staff
          </Link>
        </nav>
      </div>
    </footer>
  );
}
