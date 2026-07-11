"use client";

import { useEffect, useId, useRef, useState } from "react";
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

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}

export function PropertyGallery({ photos, propertyName }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const activePhoto = activeIndex === null ? null : (photos[activeIndex] ?? null);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const closeButton = panel?.querySelector<HTMLElement>("button");
    (closeButton ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % photos.length,
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + photos.length) % photos.length,
        );
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      const previous = previousFocusRef.current;
      if (previous?.isConnected) {
        previous.focus();
      }
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
        <div className="property-gallery-lightbox" ref={dialogRef}>
          <button
            aria-label="Close gallery"
            className="property-gallery-lightbox__backdrop"
            onClick={() => setActiveIndex(null)}
            type="button"
            tabIndex={-1}
          />
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="property-gallery-lightbox__panel"
            ref={panelRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="property-gallery-lightbox__toolbar">
              <span id={titleId}>
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
