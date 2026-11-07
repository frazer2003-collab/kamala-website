"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toggleStaffLocale } from "@/app/staff/locale-actions";
import {
  STAFF_PHRASE_TH,
  staffT,
  type StaffLocale,
} from "@/lib/staff-i18n";

const StaffLocaleContext = createContext<{
  locale: StaffLocale;
  t: (key: string) => string;
  toggle: () => void;
  pending: boolean;
}>({
  locale: "en",
  t: (key) => staffT("en", key),
  toggle: () => undefined,
  pending: false,
});

export function useStaffLocale() {
  return useContext(StaffLocaleContext);
}

function translateTextNode(node: Text, locale: StaffLocale) {
  if (locale !== "th") return;
  const original = node.nodeValue;
  if (!original || !original.trim()) return;
  let next = original;
  for (const [en, th] of STAFF_PHRASE_TH) {
    if (next.includes(en)) {
      next = next.split(en).join(th);
    }
  }
  if (next !== original) {
    node.nodeValue = next;
  }
}

function walk(node: Node, locale: StaffLocale) {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text, locale);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  if (
    el.closest(
      "script, style, textarea, input, select, code, pre, [data-staff-no-translate]",
    )
  ) {
    return;
  }
  for (const child of Array.from(node.childNodes)) {
    walk(child, locale);
  }
}

export function StaffLocaleProvider({
  locale,
  children,
}: {
  locale: StaffLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    startTransition(async () => {
      await toggleStaffLocale();
      router.refresh();
    });
  }, [router]);

  const value = useMemo(
    () => ({
      locale,
      t: (key: string) => staffT(locale, key),
      toggle,
      pending,
    }),
    [locale, pending, toggle],
  );

  useEffect(() => {
    document.documentElement.lang = locale === "th" ? "th" : "en";
    const root = document.querySelector(".staff-shell");
    if (!root) return;
    if (locale === "th") {
      walk(root, locale);
    }
  }, [locale]);

  useEffect(() => {
    if (locale !== "th") return;
    const root = document.querySelector(".staff-shell");
    if (!root) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        observer.disconnect();
        walk(root, locale);
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale]);

  return (
    <StaffLocaleContext.Provider value={value}>{children}</StaffLocaleContext.Provider>
  );
}

export function StaffLocaleToggle() {
  const { locale, t, toggle, pending } = useStaffLocale();
  const next = locale === "en" ? "TH" : "EN";
  return (
    <button
      aria-label={locale === "en" ? t("lang.switchToTh") : t("lang.switchToEn")}
      className="staff-locale-toggle"
      disabled={pending}
      onClick={toggle}
      type="button"
    >
      {next}
    </button>
  );
}
