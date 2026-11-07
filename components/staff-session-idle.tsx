"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { logoutStaff } from "@/app/staff/auth-actions";
import {
  STAFF_IDLE_STORAGE_KEY,
  STAFF_IDLE_TIMEOUT_MS,
  clearStaffIdleActivity,
  formatStaffIdleCountdown,
  staffIdleMsRemaining,
  staffIdlePhase,
} from "@/lib/staff-session-idle";
import "@/app/staff-session-idle.css";

const ACTIVITY_THROTTLE_MS = 1000;
const TICK_MS = 1000;

type StaffSessionIdleGuardProps = {
  /** localStorage key shared across tabs of the same session kind. */
  storageKey?: string;
  timeoutMs?: number;
  /** Server action that signs the user out. */
  onLogout?: () => void | Promise<void>;
  /** Shown in the idle copy (“This … has been idle”). */
  surfaceLabel?: string;
};

function readSharedActivity(storageKey: string, fallback: number) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.max(fallback, parsed);
    }
  } catch {
    // Private mode / blocked storage — local timer still works.
  }
  return fallback;
}

function writeSharedActivity(storageKey: string, at: number) {
  try {
    window.localStorage.setItem(storageKey, String(at));
  } catch {
    // Ignore quota / privacy errors.
  }
}

function clearSharedActivity(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Private mode / blocked storage.
  }
}

/**
 * Signs staff out after a long idle stretch so forgotten tabs
 * do not keep a front-desk session open overnight.
 */
export function StaffSessionIdleGuard({
  storageKey = STAFF_IDLE_STORAGE_KEY,
  timeoutMs = STAFF_IDLE_TIMEOUT_MS,
  onLogout = logoutStaff,
  surfaceLabel = "staff page",
}: StaffSessionIdleGuardProps = {}) {
  const titleId = useId();
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const signingOutRef = useRef(false);
  const [phase, setPhase] = useState<"active" | "warning">("active");
  const [msRemaining, setMsRemaining] = useState(timeoutMs);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const boot = Date.now();
    lastActivityRef.current = readSharedActivity(storageKey, boot);
    writeSharedActivity(storageKey, lastActivityRef.current);

    function markActivity() {
      if (signingOutRef.current) {
        return;
      }
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastWriteRef.current >= ACTIVITY_THROTTLE_MS) {
        lastWriteRef.current = now;
        writeSharedActivity(storageKey, now);
      }
      setPhase((current) => (current === "warning" ? "active" : current));
    }

    function signOutIdle() {
      if (signingOutRef.current) {
        return;
      }
      signingOutRef.current = true;
      clearSharedActivity(storageKey);
      if (storageKey === STAFF_IDLE_STORAGE_KEY) {
        clearStaffIdleActivity();
      }
      startTransition(() => {
        void onLogout();
      });
    }

    function evaluate() {
      if (signingOutRef.current) {
        return;
      }
      const now = Date.now();
      const lastActivity = readSharedActivity(storageKey, lastActivityRef.current);
      lastActivityRef.current = lastActivity;
      const nextPhase = staffIdlePhase(now, lastActivity, timeoutMs);
      const remaining = staffIdleMsRemaining(now, lastActivity, timeoutMs);
      setMsRemaining(remaining);

      if (nextPhase === "expired") {
        signOutIdle();
        return;
      }
      setPhase(nextPhase === "warning" ? "warning" : "active");
    }

    const activityEvents: Array<keyof DocumentEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];
    for (const eventName of activityEvents) {
      document.addEventListener(eventName, markActivity, {
        capture: true,
        passive: true,
      });
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        evaluate();
      }
    }

    function onStorage(event: StorageEvent) {
      if (event.key === storageKey) {
        evaluate();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    const tickId = window.setInterval(evaluate, TICK_MS);
    evaluate();

    return () => {
      for (const eventName of activityEvents) {
        document.removeEventListener(eventName, markActivity, true);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(tickId);
    };
  }, [onLogout, storageKey, timeoutMs]);

  useEffect(() => {
    if (phase !== "warning") {
      return;
    }
    stayButtonRef.current?.focus();
  }, [phase]);

  if (phase !== "warning") {
    return null;
  }

  const minutes = Math.round(timeoutMs / 60_000);

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="staff-session-idle"
      role="dialog"
    >
      <div className="staff-session-idle__panel">
        <h2 id={titleId}>Still there?</h2>
        <p>
          This {surfaceLabel} has been idle. For safety we sign out after{" "}
          {minutes} minutes without use, so a forgotten tab does not stay open.
        </p>
        <p className="staff-session-idle__countdown" aria-live="polite">
          Signing out in {formatStaffIdleCountdown(msRemaining)}
        </p>
        <div className="staff-session-idle__actions">
          <button
            className="button button--primary"
            disabled={pending}
            onClick={() => {
              const now = Date.now();
              lastActivityRef.current = now;
              lastWriteRef.current = now;
              writeSharedActivity(storageKey, now);
              setPhase("active");
              setMsRemaining(timeoutMs);
            }}
            ref={stayButtonRef}
            type="button"
          >
            Stay signed in
          </button>
          <button
            className="button button--secondary"
            disabled={pending}
            onClick={() => {
              signingOutRef.current = true;
              clearSharedActivity(storageKey);
              if (storageKey === STAFF_IDLE_STORAGE_KEY) {
                clearStaffIdleActivity();
              }
              startTransition(() => {
                void onLogout();
              });
            }}
            type="button"
          >
            {pending ? "Signing out…" : "Sign out now"}
          </button>
        </div>
      </div>
    </div>
  );
}
