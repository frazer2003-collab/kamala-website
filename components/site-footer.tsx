import Link from "next/link";
import { FooterSocials } from "@/components/footer-socials";
import type { PropertySettings } from "@/lib/property-settings";
import { formatPropertyTagline } from "@/lib/property-brand";
import "@/app/footer-socials.css";

export function SiteFooter({ settings }: { settings: PropertySettings }) {
  const tagline = formatPropertyTagline(settings.propertyName, settings.propertyTagline);

  return (
    <footer className="site-footer">
      <FooterSocials settings={settings} />
      <div className="site-footer__inner">
        <div className="site-footer__place">
          <strong>
            {settings.propertyName}
            {tagline ? ` · ${tagline}` : null}
          </strong>
          {settings.addressLine ? <p>{settings.addressLine}</p> : null}
        </div>
        <nav aria-label="Guest pages" className="site-footer__nav">
          <Link href="/gallery">Gallery</Link>
          <Link href="/#rooms">Rooms</Link>
          <Link href="/location">Location</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/cancellation">Cancellation</Link>
          <Link className="site-footer__staff" href="/staff/login">
            Staff
          </Link>
        </nav>
      </div>
    </footer>
  );
}
