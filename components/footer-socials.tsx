import type { JSX } from "react";
import type { PropertySettings } from "@/lib/property-settings";
import { normalizeTelHref } from "@/lib/tha-phae-seo";

type FooterSocialsProps = {
  settings: PropertySettings;
};

const iconProps = {
  "aria-hidden": true as const,
  fill: "none",
  viewBox: "0 0 20 20",
  xmlns: "http://www.w3.org/2000/svg",
};

const stroke = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.4,
};

function LineIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M4.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H8.2L4.5 16.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
        {...stroke}
      />
      <path d="M7.2 8.4h5.6M7.2 11h3.8" {...stroke} />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M6.2 3.8h2.4l1.1 2.6-1.6 1.1a8.8 8.8 0 0 0 4.4 4.4l1.1-1.6 2.6 1.1v2.4a1.4 1.4 0 0 1-1.4 1.4A11.6 11.6 0 0 1 4.8 5.2a1.4 1.4 0 0 1 1.4-1.4Z"
        {...stroke}
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M10 3.5a6.2 6.2 0 0 0-5.3 9.4L3.5 16.5l3.7-1.1A6.2 6.2 0 1 0 10 3.5Z"
        {...stroke}
      />
      <path d="M7.6 8.8c.3-.6.6-.6 1-.6h.3c.1 0 .2 0 .3.2l.4.9c.1.1.1.3 0 .4l-.3.4c-.1.1-.1.2 0 .3.4.7 1 1.3 1.7 1.7.1.1.2.1.3 0l.4-.3c.1-.1.3-.1.4 0l.9.4c.2.1.2.2.2.3v.3c0 .4-.1.7-.6 1-.5.4-1.2.4-2 .1-.9-.4-1.8-1-2.5-1.7-.7-.7-1.3-1.6-1.7-2.5-.3-.8-.3-1.5.1-2Z"
        {...stroke}
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3.8 5.8h12.4a1.2 1.2 0 0 1 1.2 1.2v6a1.2 1.2 0 0 1-1.2 1.2H3.8a1.2 1.2 0 0 1-1.2-1.2V7a1.2 1.2 0 0 1 1.2-1.2Z" {...stroke} />
      <path d="m4.2 7.2 5.8 3.8 5.8-3.8" {...stroke} />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M11.6 4.2h2.2V7h-1.8c-.7 0-.9.3-.9 1v1.4h2.6l-.4 2.6h-2.2v6.8H8.4v-6.8H6.2V9.4h2.2V8.2c0-2 1.2-3.2 3.1-3.2.9 0 1.7.1 2 .1v2.1Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M12.8 4.6c.8.9 1.8 1.4 3 1.5v2.4c-1.1 0-2.1-.3-3-.9v5.4a3.8 3.8 0 1 1-3.8-3.8c.2 0 .5 0 .7.1v2.5a1.4 1.4 0 1 0 1 1.3V4.6h2.1Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function FooterSocials({ settings }: FooterSocialsProps) {
  const contacts = [
    settings.lineUrl
      ? {
          id: "line",
          label: "LINE",
          href: settings.lineUrl,
          external: true,
          Icon: LineIcon,
        }
      : null,
    settings.contactPhone
      ? {
          id: "phone",
          label: settings.contactPhone,
          href: normalizeTelHref(settings.contactPhone),
          external: false,
          Icon: PhoneIcon,
        }
      : null,
    settings.whatsappUrl
      ? {
          id: "whatsapp",
          label: "WhatsApp",
          href: settings.whatsappUrl,
          external: true,
          Icon: WhatsAppIcon,
        }
      : null,
    settings.contactEmail
      ? {
          id: "email",
          label: settings.contactEmail,
          href: `mailto:${settings.contactEmail}`,
          external: false,
          Icon: EmailIcon,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    href: string;
    external: boolean;
    Icon: () => JSX.Element;
  }>;

  const follows = [
    settings.facebookUrl
      ? { id: "facebook", label: "Facebook", href: settings.facebookUrl, Icon: FacebookIcon }
      : null,
    settings.tiktokUrl
      ? { id: "tiktok", label: "TikTok", href: settings.tiktokUrl, Icon: TikTokIcon }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    href: string;
    Icon: () => JSX.Element;
  }>;

  if (contacts.length === 0 && follows.length === 0) {
    return null;
  }

  return (
    <div className="site-footer__socials">
      {contacts.length > 0 ? (
        <nav aria-label="Reach us" className="site-footer__contacts">
          <ul className="site-footer__contact-list">
            {contacts.map(({ id, label, href, external, Icon }) => (
              <li key={id}>
                <a
                  className="site-footer__contact-link"
                  href={href}
                  {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}
                >
                  <span className="site-footer__contact-icon">
                    <Icon />
                  </span>
                  <span className="site-footer__contact-label">{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {follows.length > 0 ? (
        <div className="site-footer__follow">
          <span className="site-footer__follow-heading" id="site-footer-follow-heading">
            Follow
          </span>
          <ul aria-labelledby="site-footer-follow-heading" className="site-footer__follow-list">
            {follows.map(({ id, label, href, Icon }) => (
              <li key={id}>
                <a
                  className="site-footer__follow-link"
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="site-footer__follow-icon">
                    <Icon />
                  </span>
                  <span className="sr-only">Follow on {label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
