import {
  getStaffSessionSecret,
  hasStaffAuthConfig,
  safeCompareStrings,
  signStaffSessionPayloadEdge,
} from "@/lib/staff-session-edge";

export const STAFF_PORTAL_COOKIE_NAME = "kamala_desk_portal";
export type DeskPortalKind = "bills" | "laundry";

export async function readDeskPortalFromTokenEdge(
  token: string | undefined,
): Promise<{ kind: DeskPortalKind } | null> {
  if (!token || !hasStaffAuthConfig()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = await signStaffSessionPayloadEdge(
      payload,
      getStaffSessionSecret(),
    );
    if (!safeCompareStrings(signature, expected)) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(base64 + pad);
    const parsed = JSON.parse(json) as {
      kind?: unknown;
      exp?: unknown;
    };
    if (parsed.kind !== "bills" && parsed.kind !== "laundry") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return { kind: parsed.kind };
  } catch {
    return null;
  }
}
