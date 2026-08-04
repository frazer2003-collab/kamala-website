"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCalendarMonthLabel, parseCalendarMonth } from "@/lib/calendar";

const DEFAULT_BUSY_MESSAGE = "Working…";
/** Calm full-screen cover only after a real wait — bar shows immediately. */
const COVER_AFTER_MS = 500;
const NAV_SAFETY_MS = 12_000;

type StaffBusyContextValue = {
  busy: boolean;
  message: string;
  startBusy: (message?: string) => void;
  endBusy: () => void;
  withBusy: <T>(work: Promise<T>, message?: string) => Promise<T>;
};

const StaffBusyContext = createContext<StaffBusyContextValue | null>(null);

export function useStaffBusy() {
  const value = useContext(StaffBusyContext);
  if (!value) {
    throw new Error("useStaffBusy must be used within StaffBusyProvider");
  }
  return value;
}

/** Safe for upload helpers that may render outside the shell in tests. */
export function useOptionalStaffBusy() {
  return useContext(StaffBusyContext);
}

function messageForStaffUrl(url: URL) {
  const path = url.pathname;
  if (path.startsWith("/staff/calendar")) {
    const month = url.searchParams.get("month");
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const { year, month: monthNum } = parseCalendarMonth(month);
      return `Opening ${formatCalendarMonthLabel(year, monthNum)}…`;
    }
    return "Opening calendar…";
  }
<<<<<<< HEAD

=======
  if (path.startsWith("/staff/reservations")) {
    return "Opening reservations…";
  }
  if (path.startsWith("/staff/sold")) {
    return "Opening sold…";
  }
  if (path.startsWith("/staff/settings/calendars")) {
    return "Opening channel calendars…";
  }
>>>>>>> cd53b04 (Add staff Reservations list with attention filters.)
  if (path.startsWith("/staff/settings/rooms")) {
    return "Opening rooms…";
  }
  if (path.startsWith("/staff/settings/tours")) {
    return "Opening tours…";
  }
  if (path.startsWith("/staff/settings")) {
    return "Opening settings…";
  }
  if (path.startsWith("/staff/promotions")) {
    return "Opening discounts…";
  }
  if (path.startsWith("/staff/gallery")) {
    return "Opening gallery…";
  }
  if (path === "/staff" || path === "/staff/") {
    return "Opening requests…";
  }
  return "Opening page…";
}

export function StaffBusyProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<string[]>([]);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState(DEFAULT_BUSY_MESSAGE);

  const syncFromStack = useCallback(() => {
    const nextCount = stackRef.current.length;
    setCount(nextCount);
    setMessage(
      nextCount > 0
        ? (stackRef.current[nextCount - 1] ?? DEFAULT_BUSY_MESSAGE)
        : DEFAULT_BUSY_MESSAGE,
    );
  }, []);

  const startBusy = useCallback(
    (nextMessage = DEFAULT_BUSY_MESSAGE) => {
      stackRef.current.push(nextMessage.trim() || DEFAULT_BUSY_MESSAGE);
      syncFromStack();
    },
    [syncFromStack],
  );

  const endBusy = useCallback(() => {
    if (stackRef.current.length === 0) {
      return;
    }
    stackRef.current.pop();
    syncFromStack();
  }, [syncFromStack]);

  const withBusy = useCallback(
    async <T,>(work: Promise<T>, nextMessage?: string) => {
      startBusy(nextMessage);
      try {
        return await work;
      } finally {
        endBusy();
      }
    },
    [endBusy, startBusy],
  );

  const value = useMemo(
    () => ({
      busy: count > 0,
      message,
      startBusy,
      endBusy,
      withBusy,
    }),
    [count, endBusy, message, startBusy, withBusy],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("staff-busy", count > 0);
    return () => {
      document.documentElement.classList.remove("staff-busy");
    };
  }, [count]);

  return (
    <StaffBusyContext.Provider value={value}>{children}</StaffBusyContext.Provider>
  );
}

export function StaffBusyOverlay() {
  const { busy, message } = useStaffBusy();
  const [showCover, setShowCover] = useState(false);

  useEffect(() => {
    if (!busy) {
      setShowCover(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowCover(true);
    }, COVER_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [busy]);

  if (!busy) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="staff-progress"
        data-cover={showCover ? "true" : "false"}
      >
        <div className="staff-progress__bar" />
      </div>
      <span className="sr-only" aria-live="polite" role="status">
        {message}
      </span>
      {showCover ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="staff-busy-overlay"
          role="status"
        >
          <span aria-hidden="true" className="staff-busy-overlay__spinner" />
          <p className="staff-busy-overlay__label">{message}</p>
        </div>
      ) : null}
    </>
  );
}

function isStaffPageNavigation(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") {
    return false;
  }
  if (anchor.hasAttribute("download")) {
    return false;
  }

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:")) {
    return false;
  }

  let next: URL;
  try {
    next = new URL(anchor.href);
  } catch {
    return false;
  }

  if (next.origin !== window.location.origin) {
    return false;
  }
  if (!next.pathname.startsWith("/staff")) {
    return false;
  }
  if (next.pathname === "/staff/login") {
    return false;
  }

  const current = new URL(window.location.href);
  if (next.pathname === current.pathname && next.search === current.search) {
    return false;
  }

  return true;
}

/** Soft progress while Next.js navigates between staff pages / query changes. */
function StaffNavBusyListener() {
  const { startBusy, endBusy } = useStaffBusy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const navigatingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavBusy = useCallback(() => {
    if (!navigatingRef.current) {
      return;
    }
    navigatingRef.current = false;
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    endBusy();
  }, [endBusy]);

  const beginNavBusy = useCallback(
    (message: string) => {
      if (navigatingRef.current) {
        return;
      }
      navigatingRef.current = true;
      startBusy(message);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      safetyTimerRef.current = setTimeout(() => {
        clearNavBusy();
      }, NAV_SAFETY_MS);
    },
    [clearNavBusy, startBusy],
  );

  useEffect(() => {
    clearNavBusy();
  }, [pathname, search, clearNavBusy]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (!isStaffPageNavigation(anchor)) {
        return;
      }

      beginNavBusy(messageForStaffUrl(new URL(anchor.href)));
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      if (navigatingRef.current) {
        navigatingRef.current = false;
        endBusy();
      }
    };
  }, [beginNavBusy, endBusy]);

  return null;
}

/**
 * Instant progress on every staff form submit. Cleared on navigation or
 * when a FormBusyBridge sees pending finish (via endBusy).
 */
function StaffFormSubmitListener() {
  const { startBusy, endBusy } = useStaffBusy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const holdingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const release = useCallback(() => {
    if (!holdingRef.current) {
      return;
    }
    holdingRef.current = false;
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    endBusy();
  }, [endBusy]);

  useEffect(() => {
    release();
  }, [pathname, search, release]);

  useEffect(() => {
    function onSubmit(event: Event) {
      if (event.defaultPrevented) {
        return;
      }
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }
      if (!form.closest(".staff-shell, .staff-login-shell")) {
        return;
      }
      if (holdingRef.current) {
        return;
      }
      holdingRef.current = true;
      const custom = form.dataset.busyMessage?.trim();
      startBusy(custom || "Saving…");
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      safetyTimerRef.current = setTimeout(() => {
        release();
      }, NAV_SAFETY_MS);
    }

    function onFormSettled() {
      release();
    }

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("staff-form-settled", onFormSettled);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("staff-form-settled", onFormSettled);
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
      if (holdingRef.current) {
        holdingRef.current = false;
        endBusy();
      }
    };
  }, [endBusy, release, startBusy]);

  return null;
}

/**
 * Mount inside staff `<form action={…}>`.
 * Does not start a second busy hold (submit listener owns that).
 * When pending clears without a navigation, notifies the submit listener.
 */
export function StaffFormBusyBridge({
  message = "Saving…",
}: {
  message?: string;
}) {
  const { pending } = useFormStatus();
  const busy = useOptionalStaffBusy();
  const wasPending = useRef(false);
  const startedLocally = useRef(false);

  useEffect(() => {
    if (!busy) {
      return;
    }

    if (pending && !wasPending.current) {
      wasPending.current = true;
      if (!document.documentElement.classList.contains("staff-busy")) {
        busy.startBusy(message);
        startedLocally.current = true;
      }
    } else if (!pending && wasPending.current) {
      wasPending.current = false;
      if (startedLocally.current) {
        busy.endBusy();
        startedLocally.current = false;
      } else {
        document.dispatchEvent(new Event("staff-form-settled"));
      }
    }
  }, [busy, message, pending]);

  useEffect(() => {
    return () => {
      if (startedLocally.current && busy) {
        busy.endBusy();
        startedLocally.current = false;
      }
    };
  }, [busy]);

  return null;
}

/** Drive progress from `useActionState` pending or local upload flags. */
export function StaffBusyEffect({
  active,
  message = "Working…",
}: {
  active: boolean;
  message?: string;
}) {
  const busy = useOptionalStaffBusy();
  const wasActive = useRef(false);

  useEffect(() => {
    if (!busy) {
      return;
    }

    if (active && !wasActive.current) {
      busy.startBusy(message);
      wasActive.current = true;
    } else if (!active && wasActive.current) {
      busy.endBusy();
      wasActive.current = false;
    }
  }, [active, busy, message]);

  useEffect(() => {
    return () => {
      if (wasActive.current && busy) {
        busy.endBusy();
        wasActive.current = false;
      }
    };
  }, [busy]);

  return null;
}

/** Warm common staff routes so page switches feel immediate. */
function StaffRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    const routes = [
      "/staff",
      "/staff/calendar",
      "/staff/reservations",
      "/staff/sold",
      "/staff/promotions",
      "/staff/gallery",
      "/staff/settings",
    ];
    for (const href of routes) {
      try {
        router.prefetch(href);
      } catch {
        // Prefetch is best-effort.
      }
    }
  }, [router]);

  return null;
}

export function StaffBusyRoot({ children }: { children: ReactNode }) {
  return (
    <StaffBusyProvider>
      {children}
      <Suspense fallback={null}>
        <StaffNavBusyListener />
        <StaffFormSubmitListener />
        <StaffRoutePrefetch />
      </Suspense>
      <StaffBusyOverlay />
    </StaffBusyProvider>
  );
}
