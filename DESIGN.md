---
name: Kamala
description: Quiet, trustworthy guesthouse booking with a staff availability surface.
colors:
  house-maroon: "oklch(48% 0.18 12)"
  house-maroon-deep: "oklch(40% 0.16 12)"
  house-maroon-light: "oklch(62% 0.14 12)"
  house-maroon-wash: "oklch(96.5% 0.025 12)"
  canvas: "oklch(99.2% 0.004 12)"
  surface: "oklch(100% 0 0)"
  surface-muted: "oklch(97.2% 0.009 12)"
  surface-strong: "oklch(94% 0.012 12)"
  ink: "oklch(22% 0.025 12)"
  muted: "oklch(46% 0.022 12)"
  soft: "oklch(56% 0.018 12)"
  border: "oklch(89% 0.01 12)"
  success: "oklch(46% 0.11 155)"
  success-wash: "oklch(96% 0.025 155)"
  warning: "oklch(68% 0.13 65)"
  warning-ink: "oklch(38% 0.11 65)"
  warning-wash: "oklch(97% 0.02 65)"
  danger: "oklch(50% 0.17 12)"
  danger-wash: "oklch(96% 0.03 12)"
  calendar-available: "#bbf7d0"
  calendar-closed: "#fecaca"
  calendar-booking: "#fef08a"
  calendar-sold-out: "#fdba74"
typography:
  display:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(2.4rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  headline:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 750
    lineHeight: 1.2
  compact:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
  ui-sm:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 650
    lineHeight: 1.3
  ui-md:
    fontFamily: "Plus Jakarta Sans, Aptos, Segoe UI, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 650
    lineHeight: 1.35
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "0.9rem"
  xl: "1rem"
  pill: "999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
  20: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.house-maroon}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0.72rem 1.15rem"
    height: "2.8rem"
  button-primary-hover:
    backgroundColor: "{colors.house-maroon-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.72rem 1.15rem"
    height: "2.8rem"
  status-pill:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.35rem"
  staff-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: Kamala

## Overview

**Creative North Star: "The Trusted Counter"**

Kamala should feel like a well-run guesthouse front desk: quiet light, clear room keys, a host who knows what is available without making the guest wait. Guests arrive comparing rooms, dates, and trust signals; staff arrive needing booking clarity. The interface earns confidence through legibility, calm pacing, and honest hospitality before it asks for a reservation.

This is a **brand-led product** surface: the public booking website creates the guesthouse impression, and the staff management area serves the workflow behind it. Reference anchor: **Stripe** — polish, spacing, and hierarchy that signal competence, translated into a quieter hospitality tone. Explicitly reject playful travel UI, booking-site clichés, purple SaaS chrome, fake luxury gold, and cold enterprise admin aesthetics.

**Key Characteristics:**
- Restrained color: maroon accent used sparingly; neutrals carry the room
- Warm humanist sans throughout — one family, multiple weights, no competing sans pairs
- Responsive motion: feedback and transitions on state change, never decorative choreography
- Flat-by-default surfaces; depth comes from spacing and tonal steps, not glass or glow
- One primary action per view; booking status, availability, and errors never rely on color alone

## Colors

Restrained strategy: tinted neutrals carry 90%+ of every screen. House maroon appears on booking actions, active nav, focus rings, and staff status emphasis — never as ambient decoration.

### Primary
- **House Maroon** (`oklch(48% 0.18 12)` / `--color-maroon`): Primary booking buttons, active nav, focused control rings, important staff status markers. Rare by design.
- **House Maroon Deep** (`oklch(40% 0.16 12)` / `--color-maroon-deep`): Hover/pressed primary, selected timeline bars.
- **House Maroon Wash** (`oklch(96.5% 0.025 12)` / `--color-maroon-wash`): Soft selection and today washes.

### Neutral
- **Canvas** (`oklch(99.2% 0.004 12)` / `--color-canvas`): Page background — lightly tinted toward maroon hue, not cream/sand default.
- **Surface** (`oklch(100% 0 0)` / `--color-surface`): Panels, dialogs, cells.
- **Surface Muted** (`oklch(97.2% 0.009 12)` / `--color-surface-muted`): Sticky headers, room section headers, secondary bands.
- **Ink** (`oklch(22% 0.025 12)` / `--color-ink`): Body text — contrast ≥4.5:1 against canvas.
- **Muted** (`oklch(46% 0.022 12)` / `--color-muted`): Secondary labels and metadata — still readable.
- **Border** (`oklch(89% 0.01 12)` / `--color-border`): Dividers and input strokes.

### Semantic
- **Success / Warning / Danger** with matching washes for status, errors, and confirmations. Warning **ink** for text on wash is `oklch(38% 0.11 65)` (not the bright warning fill). Staff calendar also uses configurable hex swatches for Bookable / Closed / Sold out / Reservation (`--calendar-color-*`).

### Named Rules
**The One Voice Rule.** If maroon appears more than once in a viewport without a booking, navigation, focus, or status purpose tied to it, the screen is over-branded.

**The Trust Tint Rule.** Neutrals pick up 0.005–0.015 chroma toward the maroon hue. Warmth lives in accent and copy, not a beige body background.

## Typography

**Display Font:** Libre Baskerville (guest hero / display moments via `--font-display`)
**Body Font:** Plus Jakarta Sans (Aptos, Segoe UI, system-ui)

**Character:** Hospitable but precise. Guest display can use the serif; UI chrome and staff stay Plus Jakarta. Do not invent a second sans.

### Hierarchy
- **Display** (Libre Baskerville, clamp ~2.4–3.75rem): Guest hero brand moments only.
- **Headline** (800, ~1.25rem staff / quieter calendar titles): Page titles such as Calendar.
- **Title** (800, ~0.92rem): Room section headers, dialog titles.
- **Body** (400, 1rem, 1.55 line-height): Instructions, form copy; max ~70ch for prose.
- **Label** (750, ~0.78rem): Timeline row labels, pills, metadata.
- **Compact / UI steps** (0.72–0.88rem): Dense staff controls, density toggle, extranet chrome.

### Named Rules
**The Single Family Rule.** UI uses one sans. Display serif is optional and guest-only.

**The Balance Rule.** Apply `text-wrap: balance` on h1–h3; `text-wrap: pretty` on long prose blocks. Heading letter-spacing floor ≥ `-0.04em`.

## Elevation

Flat by default. Surfaces separate through background steps (canvas → surface → muted → strong) and 1px borders, not drop shadows or decorative `backdrop-filter`. Shadows appear only on transient layers (dropdowns, dialogs) and stay soft.

### Shadow Vocabulary
- **Soft** (`--shadow-soft: 0 6px 20px oklch(20% 0.02 12 / 0.08)`): Light ambient lift.
- **Panel** (`--shadow-panel`): Dialogs and elevated panels.
- **Search** (`--shadow-search`): Compact floating controls.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No frosted glass on sticky chrome.

**Motion tie-in:** Entrance motion only under `prefers-reduced-motion: no-preference`; never gate content at `opacity: 0`. State transitions ~150–250ms ease-out-quint.

## Components

### Buttons
- **Shape:** Pill (`border-radius: 999px`), min-height ≥2.75rem (including quiet).
- **Primary:** House maroon fill, white text; hover deepens to maroon-deep.
- **Secondary / Quiet:** Surface with border/ink; used for Close, dismissals, secondary staff actions.
- **Focus:** 2px maroon outline with offset.

### Status pills
- Compact pill labels for Closed / Sold out / Bookable / Channel — text required; color is secondary. Channel uses maroon-wash (not indigo). On narrow viewports, short labels with full text in `title` / `aria-label`.

### Cards / Containers
- Prefer tonal bands and borders over cards. Staff calendar uses flat grid cells; dialogs use surface + panel shadow.
- Corner style: `--radius-sm` to `--radius-lg` for panels; pills for actions.

### Inputs / Fields
- Inherited form controls with labeled pairs (`.field-pair`). Errors use `.form-message--error` with `role="alert"`. Focus rings use maroon.

### Navigation
- Staff sidebar + top header. Current page via `aria-current`. Touch targets ≥2.75rem. Guest topbar is opaque surface (no glass).

### Staff timeline (signature)
- Horizontal month grid with sticky room labels and day heads. Default **Desk** density (status + assign + doors); **Full** reveals rates/net booked. Reservation bars ≥24px (≥44px on coarse pointers). Close dates is a secondary quiet control, not the loudest CTA.

## Do's and Don'ts

### Do:
- **Do** lead with booking confidence: legible room details, obvious date/availability state, plain confirmation copy after every reservation action.
- **Do** use maroon only for actions and emphasis the guest or staff member should notice.
- **Do** respect `prefers-reduced-motion` — no opacity-gated entrances when motion is reduced or off.
- **Do** pair status color with text (Closed, Sold out, Bookable, stay status labels).
- **Do** keep staff density operational without turning into cold enterprise chrome.

### Don't:
- **Don't** use overly playful or casual travel UI — no bouncy motion, whimsical illustration, meme-adjacent copy, or toy-like colors.
- **Don't** ship generic booking-site clichés — floating search cards on stock heroes, discount urgency banners, fake luxury gold, identical amenity icon grids.
- **Don't** ship generic SaaS clichés on the staff side — purple/indigo gradients, metric-stat hero blocks, decorative glassmorphism, or dashboard chrome disconnected from the guest experience.
- **Don't** dump cold enterprise chrome on staff — dense gray tables, unexplained jargon, or internal-software aesthetics.
- **Don't** use side-stripe accent borders, gradient text, nested card-in-card layouts, or uppercase tracked eyebrows on every section.
- **Don't** rely on color alone for availability, booking status, errors, or required fields.
