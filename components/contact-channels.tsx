import type { PropertySettings } from "@/lib/property-settings";
import { normalizeTelHref } from "@/lib/tha-phae-seo";

type ContactChannelsProps = {
  settings: PropertySettings;
};

export function ContactChannels({ settings }: ContactChannelsProps) {
  const channels = [
    settings.lineUrl
      ? {
          id: "line",
          label: "LINE",
          detail: "Open chat",
          href: settings.lineUrl,
          external: true,
        }
      : null,
    settings.whatsappUrl
      ? {
          id: "whatsapp",
          label: "WhatsApp",
          detail: "Message us",
          href: settings.whatsappUrl,
          external: true,
        }
      : null,
    settings.contactPhone
      ? {
          id: "phone",
          label: "Telephone",
          detail: settings.contactPhone,
          href: normalizeTelHref(settings.contactPhone),
          external: false,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    detail: string;
    href: string;
    external: boolean;
  }>;

  if (channels.length === 0) {
    return null;
  }

  return (
    <aside aria-labelledby="contact-channels-title" className="contact-channels">
      <h2 id="contact-channels-title">Reach us also</h2>
      <ul className="contact-channels__list">
        {channels.map((channel) => (
          <li key={channel.id}>
            <a
              className="contact-channels__link"
              href={channel.href}
              {...(channel.external
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {})}
            >
              <span className="contact-channels__label">{channel.label}</span>
              <span className="contact-channels__detail">{channel.detail}</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
