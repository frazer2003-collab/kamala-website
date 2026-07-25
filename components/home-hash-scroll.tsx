"use client";

import { useEffect } from "react";

/**
 * Ensure deep links like /#rooms scroll to the target section after navigation.
 * Next.js client routing sometimes lands on the top of the page instead.
 */
export function HomeHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    const scrollToHash = () => {
      const target = document.getElementById(hash);
      if (!target) {
        return false;
      }
      target.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      return true;
    };

    if (scrollToHash()) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToHash();
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
