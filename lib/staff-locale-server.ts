import { cookies } from "next/headers";
import { STAFF_LOCALE_COOKIE, parseStaffLocale } from "@/lib/staff-i18n";

export async function getStaffLocale() {
  const jar = await cookies();
  return parseStaffLocale(jar.get(STAFF_LOCALE_COOKIE)?.value);
}
