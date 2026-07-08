---
name: Kamala
description: A quiet, trustworthy guesthouse booking website with a staff booking-management surface.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Kamala

## Overview

**Creative North Star: "The Trusted Counter"**

Kamala should feel like a well-run guesthouse front desk: quiet light, clear room keys, a host who knows what is available without making the guest wait. Guests arrive comparing rooms, dates, and trust signals; staff arrive needing booking clarity. The interface earns confidence through legibility, calm pacing, and honest hospitality before it asks for a reservation.

This is a **brand-led product** surface: the public booking website creates the guesthouse impression, and the staff management area serves the workflow behind it. Reference anchor: **Stripe** — polish, spacing, and hierarchy that signal competence, translated into a quieter hospitality tone.

**Key Characteristics:**
- Restrained color: maroon accent used sparingly; neutrals carry the room
- Warm humanist sans throughout — one family, multiple weights, no competing sans pairs
- Responsive motion: feedback and transitions on state change, never decorative choreography
- Flat-by-default surfaces; depth comes from spacing and tonal steps, not glass or glow
- One primary action per view; booking status, availability, and errors never rely on color alone

## Colors

**The Restrained Rule.** Tinted neutrals carry 90%+ of every screen. The maroon accent appears on booking actions, key links, focused states, and staff status emphasis — never as ambient decoration.

**Hue anchor:** Maroon / deep wine (warm red-violet). Not purple SaaS, not orange startup, not fake luxury gold.

### Primary
- **House Maroon** `[to be resolved during implementation]`: Primary booking buttons, active nav, focused control rings, important staff status markers. Rare by design.

### Neutral
- **Canvas** `[to be resolved during implementation]`: Page background — true off-white or lightly tinted neutral toward the maroon hue, not cream/sand default.
- **Surface** `[to be resolved during implementation]`: Cards, panels, modals.
- **Ink** `[to be resolved during implementation]`: Body text — contrast ≥4.5:1 against canvas; never washed gray on tinted backgrounds.
- **Muted** `[to be resolved during implementation]`: Secondary labels and metadata — still readable, not placeholder-gray.
- **Border** `[to be resolved during implementation]`: Dividers and input strokes — subtle, hue-tinted.

### Named Rules
**The One Voice Rule.** If maroon appears more than once in a viewport without a booking, navigation, focus, or status purpose tied to it, the screen is over-branded.

**The Trust Tint Rule.** Neutrals pick up 0.005–0.015 chroma toward the maroon hue. Warmth lives in accent and copy, not a beige body background.

## Typography

**Direction:** Single warm humanist sans — one family in multiple weights (e.g. Source Sans 3, DM Sans, or similar feel). `[font pairing to be chosen at implementation]`

**Character:** Hospitable but precise. Public headings should feel calm and inviting; staff labels should stay compact and operational. No serif display layer in v1 — clarity and consistency beat boutique affectation.

### Hierarchy
- **Display** (semibold, clamp, tight leading): Page titles on marketing-adjacent entry screens only.
- **Headline** (semibold, step down from display): Section titles within flows.
- **Title** (medium, component headers): Card titles, dialog headers.
- **Body** (regular, 16–18px, 1.5–1.6 line-height, max ~70ch): Instructions, form labels, paragraphs.
- **Label** (medium, 13–14px, slight positive tracking if uppercase): Table headers, badges — uppercase sparingly.

### Named Rules
**The Single Family Rule.** Do not pair two similar sans-serifs. Weight and size carry hierarchy.

**The Balance Rule.** Apply `text-wrap: balance` on h1–h3; `text-wrap: pretty` on long prose blocks.

## Elevation

Flat by default. Surfaces separate through background steps (canvas → surface → elevated surface) and 1px borders, not drop shadows. Shadows appear only on transient layers (dropdowns, modals, toasts) and stay soft — ambient, not structural.

**Motion tie-in:** Responsive energy — hover/focus transitions (~150–250ms, ease-out), no scroll-driven reveals that delay booking or staff tasks.

## Components

`[Components to be documented once implemented — run /impeccable document in scan mode after the first build pass.]`

## Do's and Don'ts

### Do:
- **Do** lead with booking confidence: legible room details, obvious date/availability state, plain confirmation copy after every reservation action.
- **Do** use maroon only for actions and emphasis the guest or staff member should notice.
- **Do** respect `prefers-reduced-motion` — instant or crossfade alternatives for every transition.
- **Do** mirror Stripe-level spacing rhythm: generous padding in booking forms, consistent vertical gaps between room, availability, and staff-management sections.

### Don't:
- **Don't** use overly playful or casual travel UI — no bouncy motion, whimsical illustration, meme-adjacent copy, or toy-like colors that make the guesthouse feel unserious.
- **Don't** ship generic booking-site clichés — huge stock-photo hero with a floating search card, discount urgency banners, fake luxury gold accents, or identical amenity icon grids.
- **Don't** ship generic SaaS clichés on the staff side — purple gradients, metric-stat hero blocks, decorative glassmorphism, or dashboard chrome disconnected from the guest experience.
- **Don't** dump cold enterprise chrome on staff — dense gray tables, unexplained jargon, or internal-software aesthetics.
- **Don't** use side-stripe accent borders, gradient text, or nested card-in-card layouts.
- **Don't** rely on color alone for availability, booking status, errors, or required fields — pair with text, icons, or patterns.
