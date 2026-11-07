"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useStaffLocale } from "@/components/staff-locale";

type DeskQuietResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }
  | void
  | undefined;

/**
 * Desk micro-forms: no full-page busy overlay, no redirect wait.
 * Only the submit control shows pending; list updates via refresh after save.
 */
export function DeskQuietForm({
  action,
  children,
  className,
  onSuccess,
  resetOnSuccess = false,
  locked = false,
  busyGate,
  onPendingChange,
}: {
  action: (formData: FormData) => Promise<DeskQuietResult>;
  /** `pending` is this form only; `locked` means a sibling owns the gate — disable, don’t fake pending copy. */
  children: ReactNode | ((pending: boolean, locked: boolean) => ReactNode);
  className?: string;
  onSuccess?: (result: Extract<DeskQuietResult, { ok: true } | void>) => void;
  resetOnSuccess?: boolean;
  /** Sibling lock — refuse submit; do not paint Saving/Adding on this form. */
  locked?: boolean;
  /** Shared ref so two submits in the same tick cannot both start. */
  busyGate?: MutableRefObject<boolean>;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const { t } = useStaffLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || locked) return;
    if (busyGate) {
      if (busyGate.current) return;
      busyGate.current = true;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("quiet", "1");
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      const result = await action(formData);
      if (result && typeof result === "object" && "ok" in result && !result.ok) {
        setError(result.error);
        return;
      }
      if (resetOnSuccess) form.reset();
      router.refresh();
      onSuccess?.(result && typeof result === "object" && result.ok ? result : undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.couldNotSave"));
    } finally {
      if (busyGate) busyGate.current = false;
      setPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <form
      className={className}
      data-busy="quiet"
      onSubmit={onSubmit}
    >
      {typeof children === "function" ? children(pending, locked) : children}
      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Button label that swaps to a short pending state without blocking the page. */
export function deskPendingLabel(pending: boolean, label: string, pendingLabel = "Saving…") {
  return pending ? pendingLabel : label;
}
