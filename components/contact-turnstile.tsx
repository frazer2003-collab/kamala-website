"use client";

import { useEffect, useId, useRef } from "react";
import {
  CONTACT_TURNSTILE_FIELD,
} from "@/lib/contact-spam";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onContactTurnstileLoad?: () => void;
  }
}

type ContactTurnstileProps = {
  siteKey: string;
};

export function ContactTurnstile({ siteKey }: ContactTurnstileProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const inputId = useId();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let cancelled = false;

    const mount = () => {
      if (cancelled || !hostRef.current || !window.turnstile) {
        return;
      }
      if (widgetIdRef.current) {
        return;
      }
      const tokenInput = document.getElementById(inputId) as HTMLInputElement | null;
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token) => {
          if (tokenInput) {
            tokenInput.value = token;
          }
        },
        "expired-callback": () => {
          if (tokenInput) {
            tokenInput.value = "";
          }
        },
        "error-callback": () => {
          if (tokenInput) {
            tokenInput.value = "";
          }
        },
      });
    };

    window.onContactTurnstileLoad = mount;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-contact-turnstile="1"]',
    );
    if (window.turnstile) {
      mount();
    } else if (!existing) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactTurnstileLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.contactTurnstile = "1";
      document.head.appendChild(script);
    } else {
      existing.addEventListener("load", mount);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [inputId, siteKey]);

  return (
    <div className="contact-form__turnstile">
      <input id={inputId} name={CONTACT_TURNSTILE_FIELD} type="hidden" />
      <div ref={hostRef} />
    </div>
  );
}
