"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StaffLocaleToggle, useStaffLocale } from "@/components/staff-locale";
import { StaffLogoutForm } from "@/components/staff-logout-form";

export type StaffNavCurrent =
  | "home"
  | "requests"
  | "calendar"
  | "reservations"
  | "messages"
  | "bills"
  | "laundry"
  | "items"
  | "expenses"
  | "trips"
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

function IconMessages() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M4 5.5h12v8.5H9l-3 2.2V14H4z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconFood() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M6 3.5v6.5M6 10v6.5M4.5 3.5c0 2.2.7 3.5 1.5 3.5s1.5-1.3 1.5-3.5M12 3.5v13M14.5 3.5V9a2.5 2.5 0 0 1-2.5 2.5"
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

function IconExpenses() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M6 4.5h8v11H6zM8 7.5h4M8 10.5h4M8 13.5h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconLaundry() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <rect height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="12" x="4" y="3" />
      <circle cx="10" cy="11" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6h.01M10 6h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function IconItems() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path d="M4 5.5h12M4 10h12M4 14.5h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="6" cy="5.5" fill="currentColor" r=".8" />
      <circle cx="10" cy="10" fill="currentColor" r=".8" />
      <circle cx="14" cy="14.5" fill="currentColor" r=".8" />
    </svg>
  );
}

function IconTrips() {
  return (
    <svg aria-hidden="true" className="staff-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M3.5 14.5 10 4.5l6.5 10H3.5ZM10 8v3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="14" fill="currentColor" r=".9" />
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

export function StaffSidebar({ current }: StaffSidebarProps) {
  const { t } = useStaffLocale();
  const [collapsed, setCollapsed] = useState(false);

  const topItems = useMemo<NavItem[]>(
    () => [{ id: "home", href: "/staff/home", label: t("nav.home"), icon: <IconHome /> }],
    [t],
  );

  const navGroups = useMemo(
    () => [
      {
        label: t("nav.stay"),
        items: [
          {
            id: "requests" as const,
            href: "/staff/transfers",
            label: t("nav.notifications"),
            icon: <IconTransfers />,
          },
          {
            id: "calendar" as const,
            href: "/staff/calendar",
            label: t("nav.calendar"),
            icon: <IconCalendar />,
          },
          {
            id: "reservations" as const,
            href: "/staff/reservations",
            label: t("nav.allBookings"),
            icon: <IconReservations />,
          },
          {
            id: "messages" as const,
            href: "/staff/messages",
            label: t("nav.messages"),
            icon: <IconMessages />,
          },
        ],
      },
      {
        label: t("nav.desk"),
        items: [
          { id: "bills" as const, href: "/staff/bills", label: t("nav.fnb"), icon: <IconFood /> },
          {
            id: "laundry" as const,
            href: "/staff/laundry",
            label: t("nav.laundry"),
            icon: <IconLaundry />,
          },
          {
            id: "trips" as const,
            href: "/staff/trips",
            label: t("nav.trips"),
            icon: <IconTrips />,
          },
          {
            id: "items" as const,
            href: "/staff/items",
            label: t("nav.sku"),
            icon: <IconItems />,
          },
        ],
      },
      {
        label: t("nav.money"),
        items: [
          { id: "sold" as const, href: "/staff/sold", label: t("nav.finance"), icon: <IconFinance /> },
          {
            id: "expenses" as const,
            href: "/staff/expenses?view=day",
            label: t("nav.expenses"),
            icon: <IconExpenses />,
          },
          {
            id: "promotions" as const,
            href: "/staff/promotions",
            label: t("nav.discounts"),
            icon: <IconDiscounts />,
          },
        ],
      },
      {
        label: t("nav.site"),
        items: [
          {
            id: "gallery" as const,
            href: "/staff/gallery",
            label: t("nav.gallery"),
            icon: <IconGallery />,
          },
          { id: "ai" as const, href: "/staff/ai-search", label: t("nav.ai"), icon: <IconSearch /> },
          {
            id: "settings" as const,
            href: "/staff/settings",
            label: t("nav.settings"),
            icon: <IconSettings />,
          },
        ],
      },
    ],
    [t],
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const saved = window.localStorage.getItem(COLLAPSE_KEY) === "1";
      timer = setTimeout(() => setCollapsed(saved), 0);
    } catch {
      /* ignore */
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
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
        <Link className="brand brand--compact" href="/staff/home" prefetch={false}>
          <span className="brand__mark" aria-hidden="true">
            K
          </span>
          <span className="staff-sidebar__brand-text">
            <strong>Kamala</strong>
            <small>{t("nav.staff")}</small>
          </span>
        </Link>
        <StaffLocaleToggle />
        <button
          aria-controls="staff-nav"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
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
        <div className="staff-nav__group">
          {topItems.map((item) => (
            <Link
              aria-current={current === item.id ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              href={item.href}
              key={item.id}
              prefetch={false}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              <span className="staff-nav__label">{item.label}</span>
            </Link>
          ))}
        </div>
        {navGroups.map((group) => (
          <div className="staff-nav__group" key={group.label}>
            <p className="staff-nav__section">{group.label}</p>
            {group.items.map((item) => (
              <Link
                aria-current={current === item.id ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                href={item.href}
                key={item.id}
                prefetch={false}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                <span className="staff-nav__label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <StaffLogoutForm />
    </aside>
  );
}
