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
import { usePathname, useSearchParams } from "next/navigation";
import { formatCalendarMonthLabel, parseCalendarMonth } from "@/lib/calendar";

const DEFAULT_BUSY_MESSAGE = "Working…";

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
  if (path.startsWith("/staff/settings/calendars")) {
    return "Opening channel calendars…";
  }
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

  return (
    <StaffBusyContext.Provider value={value}>{children}</StaffBusyContext.Provider>
  );
}

export function StaffBusyOverlay() {
  const { busy, message } = useStaffBusy();

  if (!busy) {
    return null;
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="staff-busy-overlay"
      role="status"
    >
      <span aria-hidden="true" className="staff-busy-overlay__spinner" />
      <p className="staff-busy-overlay__label">{message}</p>
    </div>
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

/** Soft veil while Next.js navigates between staff pages / query changes. */
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
      }, 12_000);
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

/** Mount inside any staff `<form action={…}>` to drive the global veil. */
export function StaffFormBusyBridge({
  message = "Saving…",
}: {
  message?: string;
}) {
  const { pending } = useFormStatus();
  const busy = useOptionalStaffBusy();
  const wasPending = useRef(false);

  useEffect(() => {
    if (!busy) {
      return;
    }

    if (pending && !wasPending.current) {
      busy.startBusy(message);
      wasPending.current = true;
    } else if (!pending && wasPending.current) {
      busy.endBusy();
      wasPending.current = false;
    }
  }, [busy, message, pending]);

  useEffect(() => {
    return () => {
      if (wasPending.current && busy) {
        busy.endBusy();
        wasPending.current = false;
      }
    };
  }, [busy]);

  return null;
}

/** Drive the veil from `useActionState` pending or local upload flags. */
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

export function StaffBusyRoot({ children }: { children: ReactNode }) {
  return (
    <StaffBusyProvider>
      {children}
      <Suspense fallback={null}>
        <StaffNavBusyListener />
      </Suspense>
      <StaffBusyOverlay />
    </StaffBusyProvider>
  );
}
