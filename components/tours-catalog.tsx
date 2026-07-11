import { OptimizedImage } from "@/components/optimized-image";
import type { Tour } from "@/lib/content";

type ToursCatalogProps = {
  tours: Tour[];
  propertyName: string;
};

export function ToursCatalog({ tours, propertyName }: ToursCatalogProps) {
  if (tours.length === 0) {
    return (
      <div className="tours-empty">
        <h2>Tours coming soon</h2>
        <p>Check back shortly — we are putting together local experiences for guests.</p>
      </div>
    );
  }

  return (
    <section aria-label="Available tours" className="tours-catalog">
      <div className="tours-grid">
        {tours.map((tour, index) => {
          const ctaHref = tour.linkUrl?.trim() || null;
          const ctaLabel = tour.linkLabel?.trim() || "Enquire";
          const isExternal = Boolean(ctaHref?.startsWith("http"));

          return (
            <article
              className={`tour-card ${index === 0 ? "tour-card--feature" : ""}`.trim()}
              key={tour.id}
            >
              <div className="tour-card__media">
                {tour.imageUrl ? (
                  <OptimizedImage
                    alt=""
                    className="tour-card__image"
                    fill
                    priority={index < 2}
                    sizes="(max-width: 640px) 7rem, (max-width: 960px) 9rem, 10.5rem"
                    src={tour.imageUrl}
                  />
                ) : (
                  <div aria-hidden="true" className="tour-card__placeholder">
                    <span>{tour.title.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="tour-card__body">
                <div className="tour-card__copy">
                  <h2>{tour.title}</h2>
                  {tour.durationLabel || tour.priceLabel ? (
                    <div className="tour-card__meta">
                      {tour.durationLabel ? (
                        <span className="tour-card__duration">{tour.durationLabel}</span>
                      ) : null}
                      {tour.priceLabel ? <p className="tour-card__price">{tour.priceLabel}</p> : null}
                    </div>
                  ) : null}
                  <p className="tour-card__summary">{tour.summary}</p>
                </div>
              </div>

              {ctaHref ? (
                isExternal ? (
                  <a
                    className="button button--primary tour-card__cta"
                    href={ctaHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="sr-only">(opens in a new tab) </span>
                    {ctaLabel}
                  </a>
                ) : (
                  <a className="button button--primary tour-card__cta" href={ctaHref}>
                    {ctaLabel}
                  </a>
                )
              ) : (
                <p className="tour-card__enquire">
                  {ctaLabel === "Ask the front desk" || ctaLabel === "Enquire"
                    ? "Arrange at the front desk"
                    : ctaLabel}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="tours-catalog__note">
        Prefer to book ahead? Tell us which experience you want when you request a stay, or ask
        at {propertyName} when you arrive.
      </p>
    </section>
  );
}
