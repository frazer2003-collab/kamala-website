"use client";

import { useEffect, useState } from "react";
import { OptimizedImage } from "@/components/optimized-image";
import type { PropertyGalleryPhoto } from "@/lib/property-gallery";

type PropertyGalleryProps = {
  photos: PropertyGalleryPhoto[];
  propertyName: string;
};

function getGalleryLayoutClass(index: number) {
  const pattern = index % 8;

  switch (pattern) {
    case 0:
      return "property-gallery__item--wide";
    case 5:
      return "property-gallery__item--feature";
    default:
      return "";
  }
}

export function PropertyGallery({ photos, propertyName }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activePhoto = activeIndex === null ? null : (photos[activeIndex] ?? null);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % photos.length,
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + photos.length) % photos.length,
        );
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="property-gallery__empty">
        <p>Gallery photos are being prepared. Check back soon for images of the guesthouse.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="property-gallery__grid">
        {photos.map((photo, index) => (
          <li
            className={`property-gallery__item ${getGalleryLayoutClass(index)}`.trim()}
            key={photo.id}
          >
            <button
              className="property-gallery__button"
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <OptimizedImage
                alt={photo.caption ?? `Photo ${index + 1} of ${propertyName}`}
                className="property-gallery__image"
                fill
                priority={index < 2}
                sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                src={photo.url}
              />
            </button>
          </li>
        ))}
      </ul>

      {activePhoto ? (
        <div className="property-gallery-lightbox">
          <button
            aria-label="Close gallery"
            className="property-gallery-lightbox__backdrop"
            onClick={() => setActiveIndex(null)}
            type="button"
          />
          <section
            aria-label="Enlarged gallery photo"
            aria-modal="true"
            className="property-gallery-lightbox__panel"
            role="dialog"
          >
            <div className="property-gallery-lightbox__toolbar">
              <span>
                {activeIndex! + 1} / {photos.length}
              </span>
              <button
                className="button button--quiet"
                onClick={() => setActiveIndex(null)}
                type="button"
              >
                Close
              </button>
            </div>
            <OptimizedImage
              alt={activePhoto.caption ?? `Photo ${activeIndex! + 1} of ${propertyName}`}
              className="property-gallery-lightbox__image"
              height={900}
              priority
              sizes="100vw"
              src={activePhoto.url}
              width={1200}
            />
            <div className="property-gallery-lightbox__nav">
              <button
                className="button button--secondary"
                onClick={() =>
                  setActiveIndex((current) =>
                    current === null ? null : (current - 1 + photos.length) % photos.length,
                  )
                }
                type="button"
              >
                Previous
              </button>
              <button
                className="button button--secondary"
                onClick={() =>
                  setActiveIndex((current) =>
                    current === null ? null : (current + 1) % photos.length,
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
