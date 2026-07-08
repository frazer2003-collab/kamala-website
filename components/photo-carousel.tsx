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

export function PhotoCarousel({
  photos,
  alt = "",
  className,
  sizes = "(max-width: 720px) 100vw, 480px",
  placeholder,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next));
      setIndex(clamped);
      const viewport = scrollerRef.current;
      if (viewport) {
        viewport.scrollTo({ left: clamped * viewport.clientWidth, behavior: "smooth" });
      }
    },
    [photos.length],
  );

  useEffect(() => {
    setIndex(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [photos]);

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

    return <div className={`photo-carousel photo-carousel--empty ${className ?? ""}`}>{placeholder}</div>;
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
          <div className="photo-carousel__slide" key={photo}>
            <OptimizedImage
              alt={photoIndex === 0 ? alt : ""}
              className="photo-carousel__image"
              fill
              priority={photoIndex === 0}
              sizes={sizes}
              src={photo}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <div
          aria-label="Choose photo"
          className="photo-carousel__dots"
          role="tablist"
        >
          {photos.map((photo, photoIndex) => (
            <button
              aria-label={`Photo ${photoIndex + 1} of ${photos.length}`}
              aria-selected={photoIndex === index}
              className={`photo-carousel__dot${
                photoIndex === index ? " photo-carousel__dot--active" : ""
              }`}
              key={photo}
              onClick={() => goTo(photoIndex)}
              role="tab"
              type="button"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
