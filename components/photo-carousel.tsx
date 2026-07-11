"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { OptimizedImage } from "@/components/optimized-image";

type PhotoCarouselProps = {
  photos: string[];
  alt?: string;
  className?: string;
  sizes?: string;
  placeholder?: ReactNode;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);

    function onChange() {
      setReduced(media.matches);
    }

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function PhotoCarousel({
  photos,
  alt = "",
  className,
  sizes = "(max-width: 720px) 100vw, 480px",
  placeholder,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollToIndex = useCallback(
    (nextIndex: number, behavior: ScrollBehavior) => {
      const viewport = scrollerRef.current;
      if (!viewport) {
        return;
      }

      viewport.scrollTo({ left: nextIndex * viewport.clientWidth, behavior });
    },
    [],
  );

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next));
      setIndex(clamped);
      scrollToIndex(clamped, prefersReducedMotion ? "auto" : "smooth");
    },
    [photos.length, prefersReducedMotion, scrollToIndex],
  );

  useEffect(() => {
    setIndex(0);
    scrollToIndex(0, "auto");
  }, [photos, scrollToIndex]);

  useEffect(() => {
    const viewport = scrollerRef.current;
    if (!viewport || photos.length <= 1) {
      return;
    }

    const onScroll = () => {
      const width = viewport.clientWidth;
      if (width <= 0) {
        return;
      }

      const next = Math.round(viewport.scrollLeft / width);
      setIndex((current) => (current === next ? current : next));
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [photos.length]);

  if (photos.length === 0) {
    if (!placeholder) {
      return null;
    }

    return (
      <div className={`photo-carousel photo-carousel--empty ${className ?? ""}`}>
        {placeholder}
      </div>
    );
  }

  function photoAlt(photoIndex: number) {
    if (!alt) {
      return "";
    }

    if (photos.length === 1) {
      return alt;
    }

    return `${alt} (photo ${photoIndex + 1} of ${photos.length})`;
  }

  return (
    <div className={`photo-carousel ${className ?? ""}`}>
      <div
        aria-label={photos.length > 1 ? "Room photos" : undefined}
        aria-roledescription={photos.length > 1 ? "carousel" : undefined}
        className="photo-carousel__viewport"
        ref={scrollerRef}
      >
        {photos.map((photo, photoIndex) => (
          <div className="photo-carousel__slide" key={`${photo}-${photoIndex}`}>
            <OptimizedImage
              alt={photoAlt(photoIndex)}
              className="photo-carousel__image"
              fill
              loading={photoIndex === 0 ? undefined : "lazy"}
              priority={photoIndex === 0}
              sizes={sizes}
              src={photo}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <div aria-label="Choose photo" className="photo-carousel__dots" role="group">
          {photos.map((photo, photoIndex) => (
            <button
              aria-current={photoIndex === index ? "true" : undefined}
              aria-label={`Photo ${photoIndex + 1} of ${photos.length}`}
              className={`photo-carousel__dot${
                photoIndex === index ? " photo-carousel__dot--active" : ""
              }`}
              key={`${photo}-${photoIndex}`}
              onClick={() => goTo(photoIndex)}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
