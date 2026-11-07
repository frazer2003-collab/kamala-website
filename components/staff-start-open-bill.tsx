"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBill } from "@/app/desk-actions";

export function StaffStartOpenBill({
  returnTo = "/staff/bills",
}: {
  returnTo?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const formData = new FormData();
    formData.set("return-to", returnTo);
    formData.set("quiet", "1");

    void (async () => {
      try {
        const result = await createBill(formData);
        if (result?.ok && result.id) {
          router.push(`${returnTo}?open=${encodeURIComponent(result.id)}`);
          return;
        }
        setError("Could not open a bill.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not open a bill.");
      }
    })();
  }, [returnTo, router]);

  return (
    <p className={error ? "form-message form-message--error" : undefined} role="status">
      {error ?? "Opening bill…"}
    </p>
  );
}
