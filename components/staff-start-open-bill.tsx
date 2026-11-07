"use client";

import { useEffect, useRef } from "react";
import { createBill } from "@/app/desk-actions";

export function StaffStartOpenBill({
  returnTo = "/staff/bills",
}: {
  returnTo?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !formRef.current) return;
    started.current = true;
    formRef.current.requestSubmit();
  }, []);

  return (
    <form action={createBill} ref={formRef}>
      <input name="return-to" type="hidden" value={returnTo} />
      <button className="button button--primary" type="submit">
        Opening bill…
      </button>
    </form>
  );
}
