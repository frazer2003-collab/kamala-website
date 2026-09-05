# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are prospective and returning guests booking rooms at a guesthouse. They may be comparing availability on mobile, checking room details, or trying to reserve quickly with confidence that the stay is real, calm, and well-run.

Secondary users are guesthouse staff managing bookings from the same website: reviewing reservations, updating availability, handling guest details, and keeping day-to-day operations clear without needing a separate back-office tool.

## Product Purpose

Kamala is a guesthouse room booking website with a staff-facing booking management surface. The public side helps guests understand the rooms, trust the property, check availability, and book without friction. The staff side helps the guesthouse keep reservations organized from the same web presence.

Success means guests can choose and reserve a room with confidence, while staff can see what is booked, what needs attention, and what changed recently.

## Positioning

Trust and minimal friction: the product earns booking confidence by making the stay feel real and the next step obvious, without hype, urgency theater, or extra steps that don’t help the guest reserve.

## Operating Context

Guests use the public site (often on mobile) to set dates, compare rooms, and reserve. Staff use the same web presence to manage requests, calendar availability, and property settings. Undecided: any further must-keep ops rituals or role constraints beyond what already ships.

## Capabilities and Constraints

Confirmed in product use: guest stay-date search and room booking; staff sign-in; requests, calendar, and settings surfaces on the same site. Technical setup (Supabase, Stripe, staff auth env) is documented in `SETUP.md`. Undecided: deeper reservation logic called out as near-term foundation work in prior product notes—treat as evolving, not a finished claim.

## Brand Commitments

- **Name:** Kamala
- **Voice / personality:** Quiet, warm, trustworthy — approachable without becoming whimsical or informal. Clear and hospitable, like a careful host who respects the guest’s time and makes the next step obvious. Emotional goal: calm booking confidence (“This place feels real, I understand the room, I can reserve without second-guessing”).
- **Anti-references (binding):** No playful/casual travel UI; no generic booking-site clichés (urgency banners, fake luxury gold, stock-hero search cards, amenity icon grids); no generic SaaS chrome on staff; no cold enterprise admin dumped onto a small hospitality business.

## Evidence on Hand

- Booking details live in the database — do not invent reservation records, guest details, or availability outcomes.
- Room descriptions and homepage copy are product content — prefer stored/settings copy over fabricated marketing claims.
- Do not fabricate testimonials, reviews, press, or customer quotes.

## Product Principles

1. **Hospitality before hype** — Welcoming and cared-for, not promotional or loud.
2. **Trust before transaction** — Guests understand the room, dates, price, and next step before being pushed to book.
3. **Minimal friction** — One clear path from dates to reserve; remove steps that don’t earn trust.
4. **One house, two modes** — Public booking and staff management share one system; staff density only where operations need it.
5. **Task clarity** — One primary action per view; what changed, what matters, what to do next stay obvious.

## Accessibility & Inclusion

WCAG 2.1 AA contrast for text and controls; keyboard-operable interactive elements; visible focus states; semantic structure; `prefers-reduced-motion` respected. Booking status, availability, price changes, and errors must not rely on color alone.
