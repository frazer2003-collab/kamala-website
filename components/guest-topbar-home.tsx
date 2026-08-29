"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
} from "react";
import type { PropertySettings } from "@/lib/property-settings";

type GuestTopbarHomeProps = {
  settings: PropertySettings;
};

type NavIndicator = {
  left: number;
  width: number;
  visible: boolean;
};

const INITIAL_INDICATOR: NavIndicator = {
  left: 0,
  width: 0,
  visible: false,
};

export function GuestTopbarHome({ settings }: GuestTopbarHomeProps) {
  const navId = useId();
  const navPrimaryRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollCompact, setScrollCompact] = useState(0);
  const [navIndicator, setNavIndicator] = useState<NavIndicator>(INITIAL_INDICATOR);
  const [desktopNav, setDesktopNav] = useState(false);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const updateNavIndicator = useCallback((target: HTMLElement | null) => {
    const container = navPrimaryRef.current;
    if (!target || !container || !desktopNav) {
      return;
    }

    const containerBox = container.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();

    setNavIndicator({
      left: targetBox.left - containerBox.left,
      width: targetBox.width,
      visible: true,
    });
  }, [desktopNav]);

  const hideNavIndicator = useCallback(() => {
    setNavIndicator((current) => ({ ...current, visible: false }));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 720px)");
    const syncDesktopNav = () => {
      setDesktopNav(media.matches);
    };

    syncDesktopNav();
    media.addEventListener("change", syncDesktopNav);
    return () => media.removeEventListener("change", syncDesktopNav);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );

      setScrolled(scrollY > 8);
      setScrollProgress(Math.min(1, scrollY / maxScroll));
      setScrollCompact(Math.min(1, scrollY / 160));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("home-topbar-menu-open", menuOpen);
    return () => {
      document.documentElement.classList.remove("home-topbar-menu-open");
    };
  }, [menuOpen]);

  const onNavLinkPointer = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    updateNavIndicator(event.currentTarget);
  };

  const headerStyle = {
    "--topbar-scroll-progress": scrollProgress.toFixed(4),
    "--topbar-scroll-compact": scrollCompact.toFixed(4),
  } as CSSProperties;

  const headerClassName = [
    "topbar",
    "topbar--home",
    "topbar--overdrive",
    scrolled ? "topbar--scrolled" : "",
    menuOpen ? "topbar--menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName} aria-label="Main navigation" style={headerStyle}>
      <div aria-hidden="true" className="topbar__progress" />

      <div className="topbar__row">
        <Link
          aria-current="page"
          className="brand brand--logo topbar__brand"
          href="/"
          onClick={closeMenu}
        >
          <Image
            alt={settings.propertyName}
            className="brand__logo"
            height={47}
            priority
            src="/guesthouse-logo.png"
            width={70}
          />
        </Link>

        <div className="topbar__mobile-actions">
          <a className="button button--primary topbar__cta topbar__cta--mobile" href="#dates">
            Check dates
          </a>
          <button
            aria-controls={navId}
            aria-expanded={menuOpen}
            className="topbar__menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true" className="topbar__menu-icon" />
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>

        <nav aria-label="Guest navigation" className="topbar__nav" id={navId}>
          <div
            className="topbar__nav-primary"
            onMouseLeave={hideNavIndicator}
            ref={navPrimaryRef}
          >
            <span
              aria-hidden="true"
              className={
                navIndicator.visible
                  ? "topbar__nav-indicator topbar__nav-indicator--visible"
                  : "topbar__nav-indicator"
              }
              style={{
                transform: `translateX(${navIndicator.left}px)`,
                width: `${navIndicator.width}px`,
              }}
            />
            <Link
              href="/gallery"
              onBlur={hideNavIndicator}
              onClick={closeMenu}
              onFocus={onNavLinkPointer}
              onMouseEnter={onNavLinkPointer}
            >
              Gallery
            </Link>
            <Link
              href="/location"
              onBlur={hideNavIndicator}
              onClick={closeMenu}
              onFocus={onNavLinkPointer}
              onMouseEnter={onNavLinkPointer}
            >
              Location
            </Link>
            <Link
              href="/contact"
              onBlur={hideNavIndicator}
              onClick={closeMenu}
              onFocus={onNavLinkPointer}
              onMouseEnter={onNavLinkPointer}
            >
              Contact
            </Link>
          </div>

          <div aria-hidden="true" className="topbar__nav-divider" />

          <div className="topbar__nav-secondary">
            <a className="button button--primary topbar__cta topbar__cta--desktop" href="#dates">
              Check dates
            </a>
            {settings.lineUrl ? (
              <a
                className="topbar__nav-external"
                href={settings.lineUrl}
                onClick={closeMenu}
                rel="noopener noreferrer"
                target="_blank"
              >
                LINE
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : null}
            {settings.whatsappUrl ? (
              <a
                className="topbar__nav-external"
                href={settings.whatsappUrl}
                onClick={closeMenu}
                rel="noopener noreferrer"
                target="_blank"
              >
                WhatsApp
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  );
}
