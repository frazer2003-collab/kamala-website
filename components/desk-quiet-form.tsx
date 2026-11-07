"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

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
}: {
  action: (formData: FormData) => Promise<DeskQuietResult>;
  children: ReactNode | ((pending: boolean) => ReactNode);
  className?: string;
  onSuccess?: (result: Extract<DeskQuietResult, { ok: true } | void>) => void;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("quiet", "1");
    setPending(true);
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
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className={className}
      data-busy="quiet"
      onSubmit={onSubmit}
    >
      {typeof children === "function" ? children(pending) : children}
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
