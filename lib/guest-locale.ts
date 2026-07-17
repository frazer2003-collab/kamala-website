import { cookies, headers } from "next/headers";
import { GUEST_LOCALE_COOKIE } from "@/lib/guest-locale-cookie";
import { isLocale, type Locale } from "@/lib/i18n";

export { GUEST_LOCALE_COOKIE };

export function resolveGuestLocale(
  preferred?: string | null,
  acceptLanguage?: string | null,
): Locale {
  if (isLocale(preferred ?? undefined)) {
    return preferred as Locale;
  }

  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("th")) {
    return "th";
  }

  return "en";
}

export async function getRequestGuestLocale(preferred?: string | null): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return resolveGuestLocale(
    preferred ?? cookieStore.get(GUEST_LOCALE_COOKIE)?.value,
    headerStore.get("accept-language"),
  );
}
