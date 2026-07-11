"use client";

import { useEffect, useState } from "react";
import { formatStayDateRange } from "@/lib/stay-dates";

type HomeStickyDatesProps = {
  arrival?: string;
  departure?: string;
};

export function HomeStickyDates({ arrival, departure }: HomeStickyDatesProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".home-hero");
    if (!hero) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      function onScroll() {
        if (!hero) {
          return;
        }

        const rect = hero.getBoundingClientRect();
        setVisible(rect.bottom <= 64);
      }

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setVisible(!entry.isIntersecting);
        }
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!arrival || !departure || !visible) {
    return null;
  }

  return (
    <div className="home-sticky-dates" role="region" aria-label="Your selected dates">
      <p className="home-sticky-dates__label">
        {formatStayDateRange(arrival, departure)}
      </p>
      <div className="home-sticky-dates__actions">
        <a className="home-sticky-dates__change" href="#dates">
          Change dates
        </a>
        <a className="button button--primary home-sticky-dates__action" href="#rooms">
          View rooms
        </a>
      </div>
    </div>
  );
}