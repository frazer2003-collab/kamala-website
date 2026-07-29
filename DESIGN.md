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
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.45rem 0.85rem"
    height: "2.75rem"
  status-pill:
    backgroundColor: "{colors.success-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.12rem 0.45rem"
  search-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.45rem"
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

Public booking and staff management share one visual system. Reference anchor: **Stripe-level polish and hierarchy**, translated into quieter hospitality. Explicitly reject playful travel UI, booking-site clichés, purple SaaS chrome, fake luxury gold, and cold enterprise admin aesthetics.

**Key Characteristics:**
- Restrained color: maroon accent used sparingly (≤10% of a viewport); tinted neutrals carry the room
- Warm humanist sans for UI; optional display serif for guest hero moments only
- Responsive motion: state transitions only (~150–250ms); respect `prefers-reduced-motion`
- Flat-by-default surfaces; depth from spacing and tonal steps, not glass or glow
- One primary action per view; availability, booking status, and errors never rely on color alone

## Colors

Restrained strategy: tinted neutrals carry most of every screen. House maroon appears on booking actions, active nav, focus emphasis, and critical status — never as ambient decoration. Canonical values live as CSS custom properties on `:root` in `app/globals.css` (OKLCH).

### Primary
- **House Maroon** (`oklch(48% 0.18 12)` / `--color-maroon`): Primary booking actions, brand mark, important emphasis. Rare by design.
- **House Maroon Deep** (`oklch(40% 0.16 12)` / `--color-maroon-deep`): Hover/pressed primary, selected emphasis.
- **House Maroon Light** (`oklch(62% 0.14 12)` / `--color-maroon-light`): Softer accent; alias `--color-gold` resolves here (not literal gold).
- **House Maroon Wash** (`oklch(96.5% 0.025 12)` / `--color-maroon-wash`): Soft selection, today washes, selection highlight.

### Neutral
- **Canvas** (`oklch(99.2% 0.004 12)` / `--color-canvas`): Page background — lightly tinted toward maroon hue, not cream/sand default.
- **Surface** (`oklch(100% 0 0)` / `--color-surface`): Panels, dialogs, cells, guest topbar.
- **Surface Muted** (`oklch(97.2% 0.009 12)` / `--color-surface-muted`): Sticky headers, secondary bands, quiet hover fills.
- **Surface Strong** (`oklch(94% 0.012 12)` / `--color-surface-strong`): Stronger tonal step for contrast bands.
- **Ink** (`oklch(22% 0.025 12)` / `--color-ink`): Body text — contrast ≥4.5:1 against canvas.
- **Muted** (`oklch(46% 0.022 12)` / `--color-muted`): Secondary labels and metadata — still readable.
- **Soft** (`oklch(56% 0.018 12)` / `--color-soft`): Tertiary / quieter meta.
- **Border** (`oklch(89% 0.01 12)` / `--color-border`): Dividers and input strokes.

### Semantic
- **Success / Warning / Danger** with matching washes. Warning **ink** for text on wash is `oklch(38% 0.11 65)` (not the bright warning fill).
- Staff calendar also uses configurable hex swatches for Bookable / Closed / Sold out / Reservation (`--calendar-color-*`).

### Named Rules
**The One Voice Rule.** If maroon appears more than once in a viewport without a booking, navigation, focus, or status purpose tied to it, the screen is over-branded.

**The Trust Tint Rule.** Neutrals pick up light chroma toward the maroon hue. Warmth lives in accent and copy, not a beige body background.

## Typography

**Display Font:** Libre Baskerville via `--font-display` (guest hero / display moments; fallbacks Iowan Old Style, Palatino, Georgia)
**Body Font:** Plus Jakarta Sans (Aptos, Segoe UI, system-ui)

**Character:** Hospitable but precise. Guest display can use the serif; UI chrome and staff stay Plus Jakarta. Do not invent a second sans.

### Hierarchy
- **Display** (Libre Baskerville, clamp ~2.1–3.4rem in atmosphere hero / up to ~3.75rem): Guest brand moments only.
- **Headline** (800, ~1.25rem): Page titles such as Calendar / Sign in.
- **Title** (800, ~0.92rem): Section headers, dialog titles.
- **Body** (400, 1rem, 1.55 line-height): Instructions, form copy; max ~65–70ch for prose.
- **Label** (750, ~0.78rem): Timeline row labels, pills, metadata.
- **Compact / UI steps** (0.72–0.88rem): Dense staff controls and extranet chrome.

### Named Rules
**The Single Family Rule.** UI uses one sans. Display serif is optional and guest-only.

**The Balance Rule.** Prefer `text-wrap: balance` on headings and `text-wrap: pretty` on long prose. Heading letter-spacing floor ≥ `-0.04em`.

## Layout

- **Guest shell:** `.site-shell` max width `min(1280px, calc(100% - 2.5rem))`, centered.
- **Rhythm:** spacing scale `--space-1`…`--space-20` (0.25rem–5rem). Tight groups, generous section separation; more space above a heading than below it.
- **Breakpoints (content-driven, observed):** ~640px phone, ~920px tablet/desktop split (listings showcase, many guest layouts), occasional 720/900/960 for specific surfaces.
- **Density:** Guest pages are airy; staff calendar and ops are denser but keep ≥2.75rem touch targets on coarse pointers.
- **Staff login:** Distilled centered column (`min(22rem, 100%)`), no card chrome — brand, heading, fields, primary action.

## Elevation & Depth

Flat by default. Surfaces separate through background steps (canvas → surface → muted → strong) and 1px borders, not drop shadows or decorative `backdrop-filter`. Shadows appear only on transient or floating layers (dropdowns, dialogs, search bar) and stay soft with offset + blur.

### Shadow Vocabulary
- **Soft** (`--shadow-soft: 0 6px 20px oklch(20% 0.02 12 / 0.08)`): Light ambient lift.
- **Panel** (`--shadow-panel: 0 1px 2px …, 0 8px 24px …`): Dialogs and elevated panels.
- **Search** (`--shadow-search`): Compact floating controls (date search bar on hero).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No frosted glass on sticky chrome (guest topbar is opaque surface).

**Motion tie-in:** Entrance / cover motion only under `prefers-reduced-motion: no-preference`; never gate content at `opacity: 0`. State transitions use `--ease-out-quint` (~180ms). Guest date-check busy overlay is a full-viewport veil with white status copy while availability loads.

## Shapes

- **Actions:** Pill radius (`999px`) on buttons, brand chip, nav pills, search bar shell.
- **Panels / media:** `--radius-sm` (0.5rem) through `--radius-xl` (1rem) for inputs, listing media, dialogs, feature room cards.
- **Borders:** 1px `var(--color-border)`; avoid colored side-stripe accents thicker than 1px on cards/list items.
- **Forms:** Labeled `.field-pair` stacks; no card wrapping required for login or simple forms.

## Components

### Buttons
- **Shape:** Pill (`border-radius: 999px`), min-height ≥2.75–2.8rem.
- **Primary:** House maroon fill with a subtle vertical gradient (`oklch(64% 0.22 12)` → maroon); white text. Hover deepens toward maroon-deep. Hover lifts `1px` (disabled cancels lift).
- **Secondary / Quiet:** Surface + border + ink; quiet is slightly smaller padding.
- **Danger:** Maroon-tinted border/fill wash (not pure red chrome) for destructive staff actions.
- **Focus:** Visible maroon / light-maroon ring (`:focus-visible`); do not remove outlines.

### Status pills / availability
- Compact labels with mark + text (○ / × or words). Open uses success-tinted border; full uses muted dashed border. Color is secondary to text.

### Cards / Containers
- Prefer tonal bands and borders over cards. Guest room **feature** listing may use a bordered surface panel; more-room rows are list rows, not cards. Staff calendar uses flat grid cells; dialogs use surface + panel shadow.
- On phone (≤640px), more-room rows stack CTAs under content at full width.

### Inputs / Fields
- `.field-pair` with persistent labels. Errors use `.form-message--error` with `role="alert"`. Setup notes use `.form-message--setup`. Focus rings use maroon family.

### Navigation
- **Guest:** Sticky opaque topbar (surface + bottom border); current page via `aria-current`. Atmosphere hero date search sits in the first viewport.
- **Staff:** Sidebar + header; touch targets ≥2.75rem.

### Signature patterns
- **Date search (guest):** Pill search bar on atmosphere hero; submit becomes pending while checking dates; full-page busy overlay (`guest-dates-busy-overlay`) blocks interaction until rooms refresh.
- **Rooms showcase:** Featured room + “more room types” rail; desktop two-column from 920px; stacked below.
- **Staff timeline:** Horizontal month grid with sticky door-number labels; unassigned stays in Needs room # lane; reservation bars ≥24px (≥44px on coarse pointers).

## Do's and Don'ts

### Do:
- **Do** lead with booking confidence: legible room details, obvious date/availability state, plain confirmation copy.
- **Do** use maroon only for actions and emphasis the guest or staff member should notice (≤10% of the viewport).
- **Do** respect `prefers-reduced-motion` — no opacity-gated entrances when motion is reduced.
- **Do** pair status color with text (Closed, Sold out, Bookable, stay status labels).
- **Do** keep staff density operational without turning into cold enterprise chrome.
- **Do** prefer spacing and tonal steps over new card wrappers.

### Don't:
- **Don't** use playful or casual travel UI — no bouncy motion, whimsical illustration, meme-adjacent copy, or toy-like colors.
- **Don't** ship generic booking-site clichés — floating search cards on stock heroes, discount urgency banners, fake luxury gold, identical amenity icon grids.
- **Don't** ship generic SaaS clichés on staff — purple/indigo gradients, metric-stat heroes, decorative glassmorphism, or dashboard chrome disconnected from the guest experience.
- **Don't** dump cold enterprise chrome on staff — dense gray tables, unexplained jargon, or internal-software aesthetics.
- **Don't** use side-stripe accent borders, gradient text, nested card-in-card layouts, or uppercase tracked eyebrows on every section.
- **Don't** rely on color alone for availability, booking status, errors, or required fields.
- **Don't** invent a second UI sans or treat `--color-gold` as literal gold (it aliases maroon-light).
