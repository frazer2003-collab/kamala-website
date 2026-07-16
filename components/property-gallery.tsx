"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { OptimizedImage } from "@/components/optimized-image";
import type { GuestGallerySection } from "@/lib/gallery-sections";
import type { PropertyGalleryPhoto } from "@/lib/property-gallery";

type PropertyGalleryProps = {
  sections: GuestGallerySection[];
  propertyName: string;
};

type FlatPhoto = PropertyGalleryPhoto & {
  sectionId: string;
  sectionIndex: number;
  globalIndex: number;
};

function getGalleryLayoutClass(index: number, total: number) {
  if (total === 1) {
    return "property-gallery__item--solo";
  }

  if (total === 2) {
    return "property-gallery__item--half";
  }

  if (total === 3) {
    return index === 0 ? "property-gallery__item--wide" : "";
  }

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

export function PropertyGallery({ sections, propertyName }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const flatPhotos = useMemo(() => {
    const items: FlatPhoto[] = [];

    for (const section of sections) {
      section.photos.forEach((photo, sectionIndex) => {
        items.push({
          ...photo,
          sectionId: section.id,
          sectionIndex,
          globalIndex: items.length,
        });
      });
    }

    return items;
  }, [sections]);

  const activePhoto = activeIndex === null ? null : (flatPhotos[activeIndex] ?? null);

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
          current === null ? null : (current + 1) % flatPhotos.length,
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + flatPhotos.length) % flatPhotos.length,
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
  }, [activeIndex, flatPhotos.length]);

  if (flatPhotos.length === 0) {
    return (
      <div className="property-gallery__empty">
        <p>Gallery photos are being prepared. Check back soon for images of the guesthouse.</p>
      </div>
    );
  }

  return (
    <>
      <div className="property-gallery">
        {sections.map((section) =>
          section.photos.length === 0 ? null : (
            <section
              aria-labelledby={`gallery-section-${section.id}`}
              className="property-gallery__section"
              key={section.id}
            >
              <header className="property-gallery__section-header">
                <h2 id={`gallery-section-${section.id}`}>{section.title}</h2>
                <p>{section.description}</p>
              </header>
              <ul className="property-gallery__grid">
                {section.photos.map((photo, index) => {
                  const globalIndex = flatPhotos.findIndex(
                    (item) => item.id === photo.id && item.sectionId === section.id,
                  );

                  return (
                    <li
                      className={`property-gallery__item ${getGalleryLayoutClass(index, section.photos.length)}`.trim()}
                      key={photo.id}
                    >
                      <button
                        className="property-gallery__button"
                        onClick={() => setActiveIndex(globalIndex)}
                        type="button"
                      >
                        <OptimizedImage
                          alt={
                            photo.caption ??
                            `${section.title} photo ${index + 1} of ${propertyName}`
                          }
                          className="property-gallery__image"
                          fill
                          priority={globalIndex >= 0 && globalIndex < 2}
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          src={photo.url}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
        )}
      </div>

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
                {activePhoto.caption
                  ? `${activePhoto.caption} · ${activeIndex! + 1} / ${flatPhotos.length}`
                  : `${activeIndex! + 1} / ${flatPhotos.length}`}
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
              alt={
                activePhoto.caption ??
                `Photo ${activeIndex! + 1} of ${propertyName}`
              }
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
                    current === null
                      ? null
                      : (current - 1 + flatPhotos.length) % flatPhotos.length,
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
                    current === null ? null : (current + 1) % flatPhotos.length,
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
