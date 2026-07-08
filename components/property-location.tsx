import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
} from "@/lib/google-maps";

type PropertyLocationProps = {
  addressLine: string | null;
  contactPhone?: string | null;
  showMap?: boolean;
};

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="property-location__pin"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
        fill="#EA4335"
      />
      <circle cx="12" cy="9" fill="white" r="2.5" />
    </svg>
  );
}

export function PropertyLocation({
  addressLine,
  contactPhone,
  showMap = true,
}: PropertyLocationProps) {
  if (!addressLine) {
    return (
      <div className="property-location">
        <span className="property-location__label">Location</span>
        <p className="property-location__empty">
          Add your address in staff settings to show a map pin here.
        </p>
      </div>
    );
  }

  const mapsUrl = buildGoogleMapsSearchUrl(addressLine);

  return (
    <div className="property-location">
      <span className="property-location__label">Location</span>
      <a
        className="property-location__link"
        href={mapsUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <MapPinIcon />
        <span>
          <strong>{addressLine}</strong>
          {contactPhone ? <span className="property-location__phone">{contactPhone}</span> : null}
        </span>
      </a>
      {showMap ? (
        <div className="property-location__map">
          <iframe
            allowFullScreen
            className="property-location__map-frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={buildGoogleMapsEmbedUrl(addressLine)}
            title={`Map showing ${addressLine}`}
          />
        </div>
      ) : null}
    </div>
  );
}
