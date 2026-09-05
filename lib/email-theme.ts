/**
 * Email-safe brand tokens. Gmail and most clients ignore OKLCH — use hex only.
 * Values approximate DESIGN.md house-maroon neutrals.
 */

export const EMAIL = {
  maroon: "#aa1542",
  maroonDeep: "#880030",
  maroonWash: "#ffedef",
  canvas: "#fffbfc",
  surface: "#ffffff",
  surfaceMuted: "#fcf3f4",
  ink: "#251617",
  muted: "#645355",
  soft: "#7f7072",
  border: "#e1d8d9",
  white: "#ffffff",
} as const;

/** Serif for brand; sans for body — web-safe stacks that echo Libre Baskerville + Plus Jakarta. */
export const EMAIL_FONT_DISPLAY = "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, serif";
export const EMAIL_FONT_BODY =
  "'Segoe UI', Aptos, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emailNl2br(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}
