# Home middle elevate (Approach A — Quiet counter continuum)

**Date:** 2026-09-05  
**Status:** Approved  
**Scope:** Homepage between hero and footer: `HomeStayAssurances`, `HomeRoomCatalog` + `HomeBookingSection` (book zone chrome), `HomeStayStory`  
**Out of scope:** Hero/nav (already elevated), footer, sticky bars logic, booking APIs, invented copy, new photography

## Goal

Continue the Elevate film-still / Trusted Counter language through the conversion middle so the page feels one house — calm, mobile-first, booking-clear.

**Success criteria**
- Assurances read as a phrase rail, not a promo band or icon-card row.
- Rooms remain the primary conversion block; feature + rail keep date/availability/Book now behavior.
- Stay story reads editorial, not a boxed sidebar card.
- **Mobile (≤640px / ≤720px):** single-column, ≥44px targets, no horizontal overflow, CTAs full-width where stacked, readable type without pinch-zoom, rooms usable without desktop hover.
- AA contrast; `prefers-reduced-motion` respected.

## Design read

Persuade-mode middle for mobile-first direct booking. Same dials as hero elevate: VARIANCE 7 · MOTION 4 · DENSITY 3.

## Assurances

- Remove maroon-wash background band and decorative underlines / accent dots that read as marketing chrome.
- Phrase rail on canvas: serif phrase + muted detail; hairline separators between items on desktop; stacked with quiet spacing on mobile.
- Keep the five existing benefit strings.

## Rooms + book zone

- Preserve heading builders, quotes, availability, promotions, Book now / Details / dialogs.
- Feature listing: media-led, 1px border, no multi-layer shadow; on mobile stack media above copy with full-width CTAs.
- Rail rows: flat list; hover tonal only on fine pointers; on touch, no hover-dependent affordances.
- Soften `.home-book-zone` border/shadow so it is a quiet band, not a dashboard card.
- Booking panel internals unchanged except optional quieter loading chrome.

## Stay story

- Split on desktop (~920px+); single column on mobile (prose then rules).
- House rules: unboxed list; no card chrome.
- Keep Location / Gallery text links.

## Mobile requirements (binding)

| Breakpoint | Expectation |
| --- | --- |
| ≤640px | Assurances stack 1-col; room feature media full-bleed-of-content; CTA group column full-width; stay story stacks |
| ≤720px | Touch targets ≥2.75rem; rail CTAs stack under copy |
| Any | No horizontal scroll from listing grids; text wrap balance on headings |

## Motion

- Prefer no scroll-timeline blur/opacity gates on assurances.
- Optional very light fade/rise only if already present and safe under reduced-motion (content visible immediately).

## Files likely touched

- `components/home-stay-assurances.tsx` (class hooks if needed)
- `app/home-landing.css` (assurances)
- `app/globals.css` / `app/home-overdrive.css` / `app/home-direct-booking.css` (book zone, listings, stay story)
- Possibly small class renames in room catalog / stay story markup

## Acceptance checklist

- [x] Assurances: no wash band; mobile 1-col phrase rail
- [x] Rooms: quieter chrome; Book now still works with dates
- [x] Stay story: editorial; mobile stack
- [x] Mobile smoke at ~390px: no overflow, CTAs tappable
- [x] Desktop ~1280 still coherent with elevated hero
