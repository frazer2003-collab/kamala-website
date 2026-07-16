"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { OptimizedImage } from "@/components/optimized-image";

type PhotoCarouselProps = {
  photos: string[];
  alt?: string;
  className?: string;
  sizes?: string;
  placeholder?: ReactNode;
  /** Show a thumbnail strip under the main photo instead of overlay dots. */
  showThumbnails?: boolean;
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
  showThumbnails = false,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const statusId = useId();
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

  const scrollActiveThumbIntoView = useCallback(
    (activeIndex: number) => {
      const strip = thumbsRef.current;
      if (!strip) {
        return;
      }

      const active = strip.querySelector<HTMLElement>(
        `[data-thumb-index="${activeIndex}"]`,
      );
      if (!active) {
        return;
      }

      const stripRect = strip.getBoundingClientRect();
      const thumbRect = active.getBoundingClientRect();
      const nextLeft =
        strip.scrollLeft +
        (thumbRect.left - stripRect.left) -
        (stripRect.width - thumbRect.width) / 2;

      strip.scrollTo({
        left: Math.max(0, nextLeft),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion],
  );

  const goTo = useCallback(
    (next: number, options?: { focusThumb?: boolean }) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, next));
      setIndex(clamped);
      scrollToIndex(clamped, prefersReducedMotion ? "auto" : "smooth");

      if (options?.focusThumb && showThumbnails) {
        requestAnimationFrame(() => {
          thumbsRef.current
            ?.querySelector<HTMLElement>(`[data-thumb-index="${clamped}"]`)
            ?.focus();
        });
      }
    },
    [photos.length, prefersReducedMotion, scrollToIndex, showThumbnails],
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

  useEffect(() => {
    if (!showThumbnails || photos.length <= 1) {
      return;
    }

    scrollActiveThumbIntoView(index);
  }, [index, photos.length, scrollActiveThumbIntoView, showThumbnails]);

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

  function handleViewportKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (photos.length <= 1) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(photos.length - 1);
    }
  }

  function handleThumbsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (photos.length <= 1) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, { focusThumb: true });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, { focusThumb: true });
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0, { focusThumb: true });
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(photos.length - 1, { focusThumb: true });
    }
  }

  const statusLabel = `Photo ${index + 1} of ${photos.length}`;
  const showOverlayChrome = photos.length > 1 && !showThumbnails;

  return (
    <div
      className={`photo-carousel${showThumbnails ? " photo-carousel--thumbs" : ""} ${className ?? ""}`}
    >
      <div className="photo-carousel__stage">
        <div
          aria-describedby={photos.length > 1 ? statusId : undefined}
          aria-label={photos.length > 1 ? "Room photos" : undefined}
          aria-roledescription={photos.length > 1 ? "carousel" : undefined}
          className="photo-carousel__viewport"
          onKeyDown={handleViewportKeyDown}
          ref={scrollerRef}
          role={photos.length > 1 ? "region" : undefined}
          tabIndex={photos.length > 1 ? 0 : undefined}
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
          <p className="sr-only" id={statusId} aria-live="polite">
            {statusLabel}
          </p>
        ) : null}

        {showOverlayChrome ? (
          <>
            <button
              aria-label="Previous photo"
              className="photo-carousel__control photo-carousel__control--prev"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              aria-label="Next photo"
              className="photo-carousel__control photo-carousel__control--next"
              disabled={index === photos.length - 1}
              onClick={() => goTo(index + 1)}
              type="button"
            >
              <span aria-hidden="true">›</span>
            </button>
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
          </>
        ) : null}
      </div>

      {showThumbnails && photos.length > 1 ? (
        <div className="photo-carousel__thumbs-bar">
          <p aria-hidden="true" className="photo-carousel__count">
            {index + 1} of {photos.length}
          </p>
          <div
            aria-label="Photo thumbnails"
            className="photo-carousel__thumbs"
            onKeyDown={handleThumbsKeyDown}
            ref={thumbsRef}
            role="group"
          >
            {photos.map((photo, photoIndex) => (
              <button
                aria-current={photoIndex === index ? "true" : undefined}
                aria-label={`Show photo ${photoIndex + 1} of ${photos.length}`}
                className={`photo-carousel__thumb${
                  photoIndex === index ? " photo-carousel__thumb--active" : ""
                }`}
                data-thumb-index={photoIndex}
                key={`${photo}-thumb-${photoIndex}`}
                onClick={() => goTo(photoIndex)}
                tabIndex={photoIndex === index ? 0 : -1}
                type="button"
              >
                <OptimizedImage
                  alt=""
                  className="photo-carousel__thumb-image"
                  fill
                  loading={photoIndex === 0 ? undefined : "lazy"}
                  sizes="96px"
                  src={photo}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
