"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import type { PropertySettings } from "@/lib/property-settings";

type GuestTopbarHomeProps = {
  settings: PropertySettings;
};

export function GuestTopbarHome({ settings }: GuestTopbarHomeProps) {
  const navId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
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

  const headerClassName = [
    "topbar",
    "topbar--home",
    scrolled ? "topbar--scrolled" : "",
    menuOpen ? "topbar--menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName} aria-label="Main navigation">
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
          <div className="topbar__nav-primary">
            <Link href="/gallery" onClick={closeMenu}>
              Gallery
            </Link>
            <Link href="/location" onClick={closeMenu}>
              Location
            </Link>
            <Link href="/contact" onClick={closeMenu}>
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
