"use client";

import { useEffect, useState } from "react";
import { formatStayDateRange } from "@/lib/stay-dates";

type HomeStickyDatesProps = {
  arrival?: string;
  departure?: string;
};

function heroIsPastThreshold(hero: Element) {
  return hero.getBoundingClientRect().bottom <= 64;
}

export function HomeStickyDates({ arrival, departure }: HomeStickyDatesProps) {
  const [heroPast, setHeroPast] = useState(false);
  const [allowSticky, setAllowSticky] = useState(true);

  useEffect(() => {
    const hero = document.querySelector(".home-hero");
    if (!hero) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const heroEl = hero;
      function onScroll() {
        setHeroPast(heroIsPastThreshold(heroEl));
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
          setHeroPast(!entry.isIntersecting);
        }
      },
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Hold sticky chrome while the post-search #rooms jump settles.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let settleTimer = 0;
    let scrollListener: (() => void) | null = null;

    function clearListeners() {
      window.clearTimeout(settleTimer);
      if (scrollListener) {
        window.removeEventListener("scroll", scrollListener);
        window.removeEventListener("scrollend", scrollListener);
        scrollListener = null;
      }
    }

    function armSettle() {
      clearListeners();
      setAllowSticky(false);

      scrollListener = () => {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          setAllowSticky(true);
          clearListeners();
        }, 160);
      };

      window.addEventListener("scroll", scrollListener, { passive: true });
      window.addEventListener("scrollend", scrollListener);
      settleTimer = window.setTimeout(() => {
        setAllowSticky(true);
        clearListeners();
      }, 800);
    }

    function onHashOrDates() {
      if (window.location.hash === "#rooms") {
        armSettle();
      } else {
        clearListeners();
        setAllowSticky(true);
      }
    }

    onHashOrDates();
    window.addEventListener("hashchange", onHashOrDates);
    return () => {
      clearListeners();
      window.removeEventListener("hashchange", onHashOrDates);
    };
  }, [arrival, departure]);

  const visible = Boolean(arrival && departure && heroPast && allowSticky);

  if (!arrival || !departure) {
    return null;
  }

  return (
    <>
      {visible ? (
        <div className="home-sticky-dates" role="region" aria-label="Your selected dates">
          <p className="home-sticky-dates__label">{formatStayDateRange(arrival, departure)}</p>
          <a className="home-sticky-dates__change" href="#dates">
            Change dates
          </a>
        </div>
      ) : null}
      {visible ? <div aria-hidden="true" className="home-sticky-dates__spacer" /> : null}
    </>
  );
}
