# Home hero + nav elevate (Approach A — Immersive film still)

**Date:** 2026-09-05  
**Status:** Approved direction — awaiting final spec sign-off before implementation  
**Scope:** Guest homepage first viewport only: `GuestTopbar` (home variant) + atmosphere hero (photo, brand, H1, lede, date search)  
**Out of scope:** Rooms catalog, stay story, assurances, footer, sticky bars behavior changes (except contrast with new hero), staff surfaces, new photography, invented marketing copy

## Goal

Elevate the first impression of the direct-booking homepage so a guest immediately feels a real, calm place and can check dates without friction — without Booking.com clichés or abandoning the Kamala brand system.

**Success criteria**
- Brand test: removing the nav still leaves an unmistakable Kamala hero moment.
- One clear booking path in the first viewport: set dates → check availability.
- Nav does not compete with the hero; it becomes solid and legible after scroll.
- Existing stay-date / availability / SEO headline wiring stays intact.
- WCAG 2.1 AA for text and controls on the photo overlay; `prefers-reduced-motion` respected.

## Design read

Persuade-mode hospitality landing for mobile-first guests. Quiet premium / trust-first. Creative north star remains **The Trusted Counter** (DESIGN.md): restrained maroon, Libre Baskerville for display, Plus Jakarta Sans for UI, real property photo, flat-by-default surfaces.

**Dials (Taste):** VARIANCE 7 · MOTION 5 · DENSITY 3

## Approach

**A — Immersive film still:** Transparent nav over full-bleed hero photo; property name as hero-scale brand; one H1 + one lede; date search as a low, quiet instrument (not a floating OTA card); chat channels and Maps removed from primary chrome.

## Architecture (units)

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `HomeHeroShell` | Full-bleed photo + legibility overlay + content stack | Staff `heroImageUrl`, existing image resolver |
| `GuestTopbarHome` | Home-only nav: transparent → solid, logo, primary links, mobile menu | `PropertySettings` (name, chat URLs) |
| `HomeDateSearchSection` | Brand + H1 + lede + date search composition | Existing copy builders + `HomeDateSearch` |
| `HomeDateSearch` | Arrival / departure / submit (unchanged behavior) | Stay-date URL params / actions |
| Hero CSS in `globals.css` | Atmosphere layout, overlay, nav-on-photo, search instrument | Design tokens |

No new data sources. No API changes. Prefer CSS + markup composition changes over new abstractions.

## Navigation

### Desktop
- Over hero: transparent background, no bottom border (or hairline at very low opacity), light logo/wordmark and light nav links sized for contrast on the overlay.
- After scroll (~8–16px, reuse compact progress if useful): opaque `var(--color-surface)`, ink-colored links, standard bottom border — same as rest-of-site chrome.
- Left: logo + property name (nav scale — not the hero display size).
- Primary links only: Gallery · Location · Contact.
- Remove: scroll progress bar (`.topbar__progress`), sliding hover pill indicator (`.topbar__nav-indicator`), LINE/WhatsApp from the primary desktop row.

### Mobile
- Hamburger toggle (≥44px target); Escape closes.
- Open menu: opaque panel listing Gallery, Location, Contact; then LINE / WhatsApp if configured (secondary, at bottom of panel).
- When menu open over transparent nav, force opaque panel + readable ink (do not leave light-on-photo text in the drawer).

### Behavior to preserve
- `aria-current` / current-page semantics where applicable.
- Focus-visible maroon-family rings.
- Lock/unlock of `home-topbar-menu-open` class for scroll lock if already used.

## Hero composition (first viewport)

Order (top → bottom inside content stack):

1. **Brand (display)** — `propertyName` in Libre Baskerville at hero scale. This is the brand-first signal. Do not duplicate a competing brand meta-row above the H1 with Maps embedded.
2. **H1** — Keep `buildAtmosphereHeadline` / server-rendered `HomeHeroIntro` SEO path (`id="home-hero-title"`).
3. **Lede** — Keep `buildAtmosphereLede` / `HomeHeroLede` directly under the H1 (hero budget: brand → headline → supporting sentence → CTA).
4. **Date search** — Existing `HomeDateSearch` as the sole CTA group; label calm (“Check dates” or existing equivalent tone — no urgency). Visual weight stays on this control — not on Maps or chat.
5. **Photo** — Full-bleed behind everything; object-position unchanged unless contrast requires a small tweak.

**DOM order (explicit):** brand → H1 → lede → date search. This replaces the current “search then lede” stack. CSS hooks named `hero-atmosphere--dates-first` may be renamed or kept only if still useful; behavior of the search control is unchanged.

**Remove from hero brand line:** “Open in Google Maps” chip/link. Maps remains available on Location / existing contact paths; do not invent a new Maps CTA in the hero.

**Location meta:** Optional quiet one-line location under the brand or under the lede (text only, no pin badge sticker on the photo). If it adds clutter on small screens, omit and rely on H1/lede location language.

### Overlay
- Soft gradient for type legibility only (darker toward copy region; lighter where photo should read).
- No frosted glass on sticky chrome once scrolled solid; no decorative glow.
- Maroon used only on primary search submit and focus — ≤10% of viewport.

### Date search visual
- Instrument, not card: no heavy bordered floating “OTA search card.” Soft tonal shell or light surface at low opacity sufficient for contrast; soft shadow only if needed on the photo.
- Pill submit in house maroon; hover deepen; `:active` slight scale (~0.97) per Kowalski press feedback.
- Mobile: stacked fields, full-width submit, ≥44px targets.
- Preserve pending/busy overlay behavior when checking dates.

## Motion

- Optional one-shot entrance on hero copy + search (`opacity` + `translateY`, ~200–280ms, ease-out) under `prefers-reduced-motion: no-preference` only. Never gate content at `opacity: 0` without a reduced-motion fallback that shows content immediately.
- Nav: transition background, border-color, and text/logo color only (~180ms, `--ease-out-quint` or equivalent). No layout jump (reserve height).
- Do not animate keyboard-driven nav focus with sliding indicators.

## Copy & content rules

- Prefer settings-driven `propertyName`, `propertyTagline`, address-derived location labels — no fabricated taglines or reviews.
- Do not invent urgency (“Only 2 left”, countdown, fake luxury gold).
- Headline/lede builders stay the source of truth for SEO variants (e.g. Tha Phae).

## Accessibility

- Text/controls on overlay meet AA against their effective background.
- Semantic header/nav/section; H1 remains singular on the page.
- Menu: `aria-expanded`, `aria-controls`, Escape to close.
- Status and errors from date search remain text + role, not color alone.

## Error / edge handling

- Missing hero image: keep existing garden/fallback treatment; overlay and type must still pass contrast.
- Missing LINE/WhatsApp: omit those menu items.
- Date validation errors: keep existing `form-message--error` under the search.

## Testing / verification

- Desktop (~1280) and mobile (~390): first viewport screenshot — brand dominant, dates usable, no Maps/chat clutter on photo.
- Scroll: nav goes solid without jump; menu open/close on mobile.
- Keyboard: tab through nav + date fields; focus visible.
- Reduced motion: no stuck invisible content.
- Smoke: submit dates still updates URL / availability path as today.
- Detector / visual pass once after implementation (Impeccable craft-floor), then stop polishing.

## Files likely touched

- `components/guest-topbar-home.tsx`
- `components/home-date-search-section.tsx`
- `components/home-hero-intro.tsx` (Maps removal / brand hierarchy)
- `components/home-hero-shell.tsx` (only if overlay/structure hooks need it)
- `app/globals.css` (topbar--home, hero-atmosphere, overlay, search-on-photo)
- Possibly `components/guest-topbar.tsx` if shared wrappers need tone props

## Non-goals

- Redesigning below-the-fold sections
- Replacing DESIGN.md tokens or fonts
- Adding a second primary CTA in the nav (“Book now”) that duplicates the date search
- New illustration or generated hero art

## Acceptance checklist

- [ ] Transparent → solid home nav works on photo and after scroll
- [ ] Primary nav = Gallery, Location, Contact only (desktop)
- [ ] Chat links only in mobile menu (when configured)
- [ ] Hero brand is display-scale property name; Maps removed from hero
- [ ] Single H1 + single lede + date search in first viewport
- [ ] Date search behavior unchanged; look is instrument-not-card
- [ ] Motion and contrast rules above satisfied
- [ ] No changes required to booking APIs or stay-date resolution
