import {
  buildAtmosphereHeadline,
  buildAtmosphereLede,
  getGuesthouseLocationLabel,
} from "@/lib/home-hero-copy";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps";

type HomeHeroIntroProps = {
  propertyName: string;
  addressLine: string | null;
};

type HomeHeroLedeProps = {
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
};

/**
 * Server-rendered hero brand + H1 so SEO crawlers see the headline in the
 * initial HTML (not gated behind the client Suspense date search).
 */
export function HomeHeroIntro({ propertyName, addressLine }: HomeHeroIntroProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const headline = buildAtmosphereHeadline(locationLabel, propertyName, addressLine);
  const mapsUrl = addressLine?.trim()
    ? buildGoogleMapsSearchUrl(addressLine)
    : null;

  return (
    <div className="hero-atmosphere__copy">
      <p className="hero-atmosphere__brand">
        <span className="hero-atmosphere__property">{propertyName}</span>
        {locationLabel &&
        locationLabel.toLowerCase() !== propertyName.toLowerCase() ? (
          <>
            <span aria-hidden="true" className="hero-atmosphere__brand-sep">
              ·
            </span>
            <span>{locationLabel}</span>
          </>
        ) : null}
        {mapsUrl ? (
          <>
            <span aria-hidden="true" className="hero-atmosphere__brand-sep">
              ·
            </span>
            <a
              className="hero-atmosphere__maps"
              href={mapsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                aria-hidden="true"
                className="hero-atmosphere__maps-pin"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.15 4.5 8.5 4.5 8.5s4.5-5.35 4.5-8.5A4.5 4.5 0 0 0 8 1.5zm0 6.25a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5z" />
              </svg>
              Open in Google Maps
            </a>
          </>
        ) : null}
      </p>

      <h1 id="home-hero-title">{headline}</h1>
    </div>
  );
}

/** Supporting hero sentence — placed after the date search for dates-first order. */
export function HomeHeroLede({
  propertyName,
  propertyTagline,
  addressLine,
}: HomeHeroLedeProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const lede = buildAtmosphereLede(locationLabel, propertyTagline, addressLine);

  return <p className="hero-atmosphere__lede">{lede}</p>;
}
