import {
  buildAtmosphereHeadline,
  buildAtmosphereLede,
  getGuesthouseLocationLabel,
} from "@/lib/home-hero-copy";
import { buildGoogleMapsSearchUrl } from "@/lib/google-maps";

type HomeHeroIntroProps = {
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
};

/**
 * Server-rendered hero copy so the H1 is in the initial HTML for SEO crawlers
 * (not gated behind the client Suspense boundary used by the date search).
 * Brand is the H1; Tha Pae / location SEO lives in the lede and lower page.
 */
export function HomeHeroIntro({
  propertyName,
  propertyTagline,
  addressLine,
}: HomeHeroIntroProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const headline = buildAtmosphereHeadline(locationLabel, propertyName, addressLine);
  const lede = buildAtmosphereLede(locationLabel, propertyTagline, addressLine);
  const mapsUrl = addressLine?.trim()
    ? buildGoogleMapsSearchUrl(addressLine)
    : null;

  return (
    <div className="hero-atmosphere__copy">
      <h1 id="home-hero-title">{headline}</h1>

      <p className="hero-atmosphere__lede">{lede}</p>

      {mapsUrl ? (
        <p className="hero-atmosphere__brand">
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
            <span>
              {propertyName} on Google Maps
              {locationLabel &&
              locationLabel.toLowerCase() !== propertyName.toLowerCase()
                ? ` · ${locationLabel}`
                : ""}
            </span>
          </a>
        </p>
      ) : locationLabel.toLowerCase() !== propertyName.toLowerCase() ? (
        <p className="hero-atmosphere__brand">{locationLabel}</p>
      ) : null}
    </div>
  );
}
