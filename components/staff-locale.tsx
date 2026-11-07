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

/** Keep English originals so switching back from TH can restore them. */
const originalText = new WeakMap<Text, string>();

function translateTextNode(node: Text) {
  const current = node.nodeValue;
  if (!current || !current.trim()) return;

  if (!originalText.has(node)) {
    originalText.set(node, current);
  }
  const source = originalText.get(node) ?? current;
  let next = source;
  for (const [en, th] of STAFF_PHRASE_TH) {
    if (next.includes(en)) {
      next = next.split(en).join(th);
    }
  }
  if (next !== current) {
    node.nodeValue = next;
  }
}

function restoreTextNode(node: Text) {
  const source = originalText.get(node);
  if (source != null && node.nodeValue !== source) {
    node.nodeValue = source;
  }
}

function walk(node: Node, locale: StaffLocale) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (locale === "th") {
      translateTextNode(node as Text);
    } else {
      restoreTextNode(node as Text);
    }
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
  const [pending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    startTransition(async () => {
      await toggleStaffLocale();
      // Hard reload: soft refresh keeps phrase-mutated Thai DOM around.
      window.location.reload();
    });
  }, []);

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
    walk(root, locale);
  }, [locale]);

  useEffect(() => {
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
      data-staff-no-translate=""
      disabled={pending}
      onClick={toggle}
      type="button"
    >
      {next}
    </button>
  );
}
