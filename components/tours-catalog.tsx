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
    <div className="tours-grid">
      {tours.map((tour, index) => {
        const ctaHref = tour.linkUrl?.trim() || null;
        const ctaLabel = tour.linkLabel?.trim() || "Enquire";
        const isExternal = Boolean(ctaHref?.startsWith("http"));

        return (
          <article className="tour-card" key={tour.id}>
            <div className="tour-card__media">
              {tour.imageUrl ? (
                <OptimizedImage
                  alt=""
                  className="tour-card__image"
                  fill
                  priority={index < 2}
                  sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  src={tour.imageUrl}
                />
              ) : (
                <div aria-hidden="true" className="tour-card__placeholder">
                  <span>{tour.title.charAt(0)}</span>
                </div>
              )}
              <div aria-hidden="true" className="tour-card__scrim" />
              {tour.durationLabel ? (
                <span className="tour-card__duration">{tour.durationLabel}</span>
              ) : null}
            </div>

            <div className="tour-card__body">
              <div className="tour-card__copy">
                <h2>{tour.title}</h2>
                {tour.priceLabel ? <p className="tour-card__price">{tour.priceLabel}</p> : null}
                <p className="tour-card__summary">{tour.summary}</p>
              </div>

              {ctaHref ? (
                isExternal ? (
                  <a
                    className="button button--primary tour-card__cta"
                    href={ctaHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <a className="button button--primary tour-card__cta" href={ctaHref}>
                    {ctaLabel}
                  </a>
                )
              ) : (
                <p className="tour-card__note">
                  Ask at {propertyName} when you arrive — we can help arrange this tour.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
