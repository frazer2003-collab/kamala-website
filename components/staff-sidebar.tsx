"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { StaffLogoutForm } from "@/components/staff-logout-form";

export type StaffNavCurrent =
  | "home"
  | "requests"
  | "calendar"
  | "reservations"
  | "sold"
  | "promotions"
  | "gallery"
  | "ai"
  | "settings";

type StaffSidebarProps = {
  current: StaffNavCurrent;
};

const COLLAPSE_KEY = "kamala-staff-sidebar-collapsed";

type NavItem = {
  id: StaffNavCurrent;
  href: string;
  label: string;
  icon: ReactNode;
};

function IconHome() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 9.2 10 3.5l6.5 5.7V16a1 1 0 0 1-1 1h-3.5v-4.2H8V17H4.5a1 1 0 0 1-1-1V9.2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconTransfers() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 7.5h9.5M11 4.5l3.5 3-3.5 3M16 12.5H6.5M9 9.5l-3.5 3 3.5 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <rect
        height="12.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        width="14"
        x="3"
        y="4.5"
      />
      <path
        d="M3 8.5h14M7 3v3M13 3v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconReservations() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M5 4.5h10v12H5zM7.5 7.5h5M7.5 10.5h5M7.5 13.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconFinance() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 15.5 8 10l3 3 5-7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M13.5 5.5H16v2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function IconDiscounts() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M4.5 11.5 11.5 4.5h3v3L7.5 14.5zM13.2 6.8l1.5 1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="6.2" cy="13.2" fill="currentColor" r="1" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <rect
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        width="14"
        x="3"
        y="4"
      />
      <path
        d="m3.5 13.5 3.2-3.2a1 1 0 0 1 1.4 0L12 14m-1.5-2 1.3-1.3a1 1 0 0 1 1.4 0l2.8 2.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.5v1.4M10 15.1v1.4M3.5 10h1.4M15.1 10h1.4M5.4 5.4l1 1M13.6 13.6l1 1M14.6 5.4l-1 1M6.4 13.6l-1 1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", href: "/staff/home", label: "Home", icon: <IconHome /> },
  { id: "requests", href: "/staff/transfers", label: "Transfers", icon: <IconTransfers /> },
  { id: "calendar", href: "/staff/calendar", label: "Calendar", icon: <IconCalendar /> },
  {
    id: "reservations",
    href: "/staff/reservations",
    label: "Reservations",
    icon: <IconReservations />,
  },
  { id: "sold", href: "/staff/sold", label: "Finance", icon: <IconFinance /> },
  { id: "promotions", href: "/staff/promotions", label: "Discounts", icon: <IconDiscounts /> },
  { id: "gallery", href: "/staff/gallery", label: "Gallery", icon: <IconGallery /> },
  { id: "ai", href: "/staff/ai-search", label: "AI search", icon: <IconSearch /> },
  { id: "settings", href: "/staff/settings", label: "Settings", icon: <IconSettings /> },
];

export function StaffSidebar({ current }: StaffSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={`staff-sidebar${collapsed ? " staff-sidebar--collapsed" : ""}`}
      aria-label="Staff navigation"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className="staff-sidebar__top">
        <Link className="brand brand--compact" href="/staff/home">
          <span className="brand__mark" aria-hidden="true">
            K
          </span>
          <span className="staff-sidebar__brand-text">
            <strong>Kamala</strong>
            <small>Staff</small>
          </span>
        </Link>
        <button
          aria-controls="staff-nav"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="staff-sidebar__collapse"
          onClick={toggleCollapsed}
          type="button"
        >
          <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
            <path
              d={collapsed ? "M8 5.5 12.5 10 8 14.5" : "M12 5.5 7.5 10 12 14.5"}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
      <nav className="staff-nav" id="staff-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            aria-current={current === item.id ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            href={item.href}
            key={item.id}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            <span className="staff-nav__label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <StaffLogoutForm />
    </aside>
  );
}
