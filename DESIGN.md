---
name: Kamala
description: Place-first guesthouse booking with calm editorial hospitality and a shared staff surface.
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
  room-detail-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  staff-dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: Kamala

## Overview

**Creative North Star: "The Garden Key"**

Kamala should feel like being handed the key to a real garden house in Chiang Mai Old City: the place leads, the interface stays hospitable and almost invisible, and booking confidence comes from photos, dates, and plain next steps—not urgency theater. Guests arrive comparing rooms and trust; staff arrive needing clarity. One visual system serves both modes.

Public marketing leans **editorial calm**: Libre Baskerville for brand and section voice, Plus Jakarta Sans for UI, film-still hero photography, and quiet continuum into rooms and stay story. Booking and ops surfaces may use slightly more lift (search bar, room-detail panel, sticky date strip) while guest marketing chrome stays flat. Reference bar: Stripe-level hierarchy translated into quieter hospitality.

**Key Characteristics:**
- Place and photography lead; chrome recedes
- House maroon used sparingly (≤10% of a viewport) for booking actions and critical emphasis
- Display serif for guest brand moments; one sans for all UI and staff
- Hybrid depth: flat tonal guest surfaces; soft panel/search shadows on booking overlays
- Calm motion (`--ease-out-quint`, ~150–280ms states; authored hero/menu entrances); respect `prefers-reduced-motion`
- One primary action per view; availability and status never rely on color alone

## Colors

Restrained strategy: maroon-tinted neutrals carry most of every screen. House maroon is the single accent voice—booking CTAs, focus, and rare emphasis—not ambient decoration. Canonical values live as CSS custom properties on `:root` in `app/globals.css` (OKLCH).

### Primary
- **House Maroon** (`oklch(48% 0.18 12)` / `--color-maroon`): Primary booking actions, brand emphasis, active focus. Rare by design.
- **House Maroon Deep** (`oklch(40% 0.16 12)` / `--color-maroon-deep`): Hover/pressed primary, selected emphasis.
- **House Maroon Light** (`oklch(62% 0.14 12)` / `--color-maroon-light`): Softer accent; `--color-gold` aliases here (not literal gold).
- **House Maroon Wash** (`oklch(96.5% 0.025 12)` / `--color-maroon-wash`): Soft selection, sticky-date wash, highlight bands.

### Neutral
- **Canvas** (`oklch(99.2% 0.004 12)` / `--color-canvas`): Page background—lightly tinted toward maroon hue, not cream/sand default.
- **Surface** (`oklch(100% 0 0)` / `--color-surface`): Panels, dialogs, guest topbar when solid, room-detail panel.
- **Surface Muted** (`oklch(97.2% 0.009 12)` / `--color-surface-muted`): Sticky headers, secondary bands, quiet hover fills.
- **Surface Strong** (`oklch(94% 0.012 12)` / `--color-surface-strong`): Stronger tonal step for contrast bands.
- **Ink** (`oklch(22% 0.025 12)` / `--color-ink`): Body text—contrast ≥4.5:1 against canvas.
- **Muted** (`oklch(46% 0.022 12)` / `--color-muted`): Secondary labels and metadata.
- **Soft** (`oklch(56% 0.018 12)` / `--color-soft`): Tertiary / quieter meta.
- **Border** (`oklch(89% 0.01 12)` / `--color-border`): Dividers and input strokes.

### Semantic
- **Success / Warning / Danger** with matching washes. Warning **ink** for text on wash is `oklch(38% 0.11 65)`.
- Staff calendar hex swatches: Bookable / Closed / Sold out / Reservation (`--calendar-color-*`).

### Named Rules
**The One Voice Rule.** If maroon appears more than once in a viewport without a booking, navigation, focus, or status purpose, the screen is over-branded.

**The Trust Tint Rule.** Neutrals pick up light chroma toward the maroon hue. Warmth lives in accent, photography, and copy—not a beige body background.

**The Place-First Rule.** On guest marketing surfaces, real room/garden imagery and brand display type outrank UI decoration.

## Typography

**Display Font:** Libre Baskerville via `--font-display` (guest hero, room titles, section display; fallbacks Iowan Old Style, Palatino, Georgia)  
**Body Font:** Plus Jakarta Sans (Aptos, Segoe UI, system-ui)

**Character:** Editorial calm—serif carries the house voice; sans keeps booking and staff precise and hospitable.

### Hierarchy
- **Display** (Libre Baskerville, clamp ~1.85–3.55rem on home elevate / up to ~3.75rem): Guest brand and film-still moments only.
- **Headline** (800, ~1.25rem): Page titles such as Calendar / Sign in; room-detail `h2` may use display serif at ~1.2–1.75rem.
- **Title** (800, ~0.92rem): Section headers, dialog chrome labels.
- **Body** (400, 1rem, 1.55 line-height): Instructions and prose; max ~65–70ch.
- **Label** (750, ~0.78rem): Pills, metadata, timeline labels.
- **Compact / UI steps** (0.72–0.88rem): Dense staff controls and extranet chrome.

### Named Rules
**The Single Family Rule.** UI uses one sans. Display serif is optional and guest-facing.

**The Balance Rule.** Prefer `text-wrap: balance` on headings and `text-wrap: pretty` on long prose. Heading letter-spacing floor ≥ `-0.04em`.

## Layout

- **Guest shell:** `.site-shell` max width `min(1280px, calc(100% - 2.5rem))`, centered.
- **Rhythm:** spacing scale `--space-1`…`--space-20` (0.25rem–5rem). Tight groups, generous section separation; more space above a heading than below it.
- **Breakpoints (observed):** ~640px phone; ~720px home topbar/desktop chrome split; ~920px listings two-column; occasional 960 for hero max-width.
- **Density:** Guest pages are airy; staff calendar/ops denser with ≥2.75rem touch targets on coarse pointers.
- **Home film-still:** First viewport is one composition—brand, one headline, lede, date search—on full-bleed photography. Assurances sit below the fold on desktop.
- **Home topbar:** Fixed over the hero (`position: fixed`); transparent over film-still, solid when scrolled. Mobile: centered brand lockup + menu. Desktop: horizontal logo+name, inline nav (chat channels stay mobile-menu only).
- **Staff login:** Distilled centered column (`min(22rem, 100%)`), no card chrome.

## Elevation & Depth

**Hybrid depth.** Guest marketing is flat-by-default: canvas → surface → muted → strong and 1px borders. Booking and floating layers may lift: date search on hero, room-detail dialog, sticky date strip, and dropdowns use soft panel/search shadows. No frosted glass on sticky chrome; no decorative glow.

### Shadow Vocabulary
- **Soft** (`--shadow-soft: 0 6px 20px oklch(20% 0.02 12 / 0.08)`): Light ambient lift.
- **Panel** (`--shadow-panel`): Dialogs and elevated panels (room details, staff dialogs).
- **Search** (`--shadow-search`): Compact floating controls (atmosphere date search).

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest on marketing. Shadows respond to floating/booking state, not decoration.

**Motion tie-in:** Hero arrive, menu panel, sticky dates, and room-detail open use `--ease-out-quint` under `prefers-reduced-motion: no-preference`. Never gate content at `opacity: 0` as the only resting state. Ken Burns on hero imagery is desktop-only.

## Shapes

- **Actions:** Pill radius (`999px`) on buttons, nav pills, search-bar shell, quiet close controls.
- **Panels / media:** `--radius-sm` (0.5rem) through `--radius-xl` (1rem) for inputs, listing media, dialogs, feature cards.
- **Borders:** 1px `var(--color-border)`; avoid colored side-stripe accents thicker than 1px on cards/list items.
- **Forms:** Labeled `.field-pair` stacks; no card wrapping required for login or simple forms.

## Components

Editorial calm: controls are clear and pill-shaped; photography and display type do the persuading.

### Buttons
- **Shape:** Pill (`border-radius: 999px`), min-height ≥2.75–2.8rem.
- **Primary:** House maroon fill with subtle vertical gradient (`oklch(64% 0.22 12)` → maroon); white text. Hover deepens toward maroon-deep. Press `scale(0.97–0.98)`.
- **Secondary / Quiet:** Surface + border + ink; quiet is slightly smaller padding.
- **Focus:** Visible maroon-family ring (`:focus-visible`); do not remove outlines.

### Status pills / availability
- Compact labels with mark + text. Open uses success-tinted border; full uses muted dashed border. Color is secondary to text.

### Cards / Containers
- Prefer tonal bands and borders over cards. Guest feature listing may use a bordered surface panel; more-room rows are list rows. Room-detail dialog is a surface panel with panel shadow, max-height ~92–94dvh, sticky book footer.
- On phone (≤640px), more-room rows stack CTAs under content at full width.

### Inputs / Fields
- `.field-pair` with persistent labels. Errors use `.form-message--error` with `role="alert"`. Focus rings use maroon family.

### Navigation
- **Guest home:** Fixed topbar; over-hero white brand/nav; scrolled solid surface. Mobile hamburger opens full-width panel with staggered link entrance. Desktop inline Gallery / Location / Contact.
- **Guest other pages:** Opaque topbar; current page via `aria-current`.
- **Staff:** Sidebar + header; touch targets ≥2.75rem.

### Signature patterns
- **Date search (guest):** Pill search bar on atmosphere hero; pending submit; full-page busy overlay while availability loads.
- **Sticky dates:** Fixed under topbar after hero; shell-aligned wash on desktop; spacer clears fixed chrome.
- **Rooms showcase:** Featured room + more-room rail; desktop two-column from 920px.
- **Room details dialog:** Compact header (title + ×), Prev/Next room pager, photo carousel, essentials, sticky footer with price + Book now (side-by-side from 720px).
- **Staff timeline:** Horizontal month grid with sticky door-number labels; reservation bars ≥24px (≥44px on coarse pointers).

## Do's and Don'ts

### Do:
- **Do** lead with place and booking confidence: real imagery, legible room details, obvious dates/price/next step.
- **Do** use maroon only for actions and emphasis the guest or staff member should notice (≤10% of the viewport).
- **Do** keep the first homepage viewport to brand, one headline, lede, and date search.
- **Do** respect `prefers-reduced-motion`—no opacity-gated resting content when motion is reduced.
- **Do** pair status color with text (Closed, Sold out, Bookable, stay status labels).
- **Do** prefer spacing and tonal steps over new card wrappers on marketing surfaces.

### Don't:
- **Don't** use playful or casual travel UI—no bouncy motion, whimsical illustration, or toy-like colors.
- **Don't** ship generic booking-site clichés—urgency banners, fake luxury gold, stock-hero search cards, amenity icon grids.
- **Don't** ship generic SaaS clichés on staff—purple/indigo gradients, metric-stat heroes, decorative glassmorphism.
- **Don't** dump cold enterprise chrome on staff—dense gray tables or unexplained jargon.
- **Don't** use side-stripe accent borders, gradient text, nested card-in-card layouts, or uppercase tracked eyebrows on every section.
- **Don't** rely on color alone for availability, booking status, errors, or required fields.
- **Don't** invent a second UI sans or treat `--color-gold` as literal gold (it aliases maroon-light).
