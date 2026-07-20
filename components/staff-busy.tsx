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

type StaffBusyContextValue = {
  busy: boolean;
  startBusy: () => void;
  endBusy: () => void;
  withBusy: <T>(work: Promise<T>) => Promise<T>;
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

export function StaffBusyProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const startBusy = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const endBusy = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  const withBusy = useCallback(
    async <T,>(work: Promise<T>) => {
      startBusy();
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
      startBusy,
      endBusy,
      withBusy,
    }),
    [count, endBusy, startBusy, withBusy],
  );

  return (
    <StaffBusyContext.Provider value={value}>{children}</StaffBusyContext.Provider>
  );
}

export function StaffBusyOverlay() {
  const { busy } = useStaffBusy();

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
      <p className="staff-busy-overlay__label">Working…</p>
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

  const beginNavBusy = useCallback(() => {
    if (navigatingRef.current) {
      return;
    }
    navigatingRef.current = true;
    startBusy();
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = setTimeout(() => {
      clearNavBusy();
    }, 12_000);
  }, [clearNavBusy, startBusy]);

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

      beginNavBusy();
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
export function StaffFormBusyBridge() {
  const { pending } = useFormStatus();
  const busy = useOptionalStaffBusy();
  const wasPending = useRef(false);

  useEffect(() => {
    if (!busy) {
      return;
    }

    if (pending && !wasPending.current) {
      busy.startBusy();
      wasPending.current = true;
    } else if (!pending && wasPending.current) {
      busy.endBusy();
      wasPending.current = false;
    }
  }, [busy, pending]);

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
export function StaffBusyEffect({ active }: { active: boolean }) {
  const busy = useOptionalStaffBusy();
  const wasActive = useRef(false);

  useEffect(() => {
    if (!busy) {
      return;
    }

    if (active && !wasActive.current) {
      busy.startBusy();
      wasActive.current = true;
    } else if (!active && wasActive.current) {
      busy.endBusy();
      wasActive.current = false;
    }
  }, [active, busy]);

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
