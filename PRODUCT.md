# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the owner of this guesthouse, often away from the house, running Kamala from somewhere else. They open the site to see what the business has earned, which nights are still open, whether the published rate is right, and which payments need a check, then they act.

Guests use the public site to understand the rooms, check dates, and book. They are not the person the product is built around.

Staff may sign in to handle the day’s stays. The product is still for the owner.

## Product Purpose

Kamala lets the owner run this guesthouse from anywhere. Guests still book on the public site. Signed in, the owner uses the calendar, requests, and finance to see what was earned, which nights are still open, whether the published rate is right, and which payments need a check, then acts.

Success means the owner can decide and act without being at the desk. The public site still lets a guest reserve with a clear room, price, and next step.

## Positioning

One house, run from anywhere. The owner sees the real calendar and the real books, and acts in the same place the guest booked. The app stays this guesthouse. It is not a tracker for other businesses.

## Operating Context

The owner uses the signed-in site away from the property. Guests use the public site, often on a phone, to set dates and reserve. Staff may sign in for the day’s requests and calendar. The owner’s tools are the calendar, requests, and finance. Undecided: any further must-keep rituals beyond those three.

## Capabilities and Constraints

Confirmed: guest stay-date search and room booking; staff sign-in; requests, calendar, finance, and settings on the same site. Technical setup (Supabase, Stripe, staff auth env) is documented in `SETUP.md`.

The app records this house only. Do not generalize it into a product for other businesses. Channel nights have no saved selling price, so they stay out of the money. A stay saved at 0 stays at 0.

## Brand Commitments

- **Name:** Kamala
- **Voice / personality:** Quiet, warm, trustworthy — approachable without becoming whimsical or informal. Clear and hospitable, like a careful host who respects the guest’s time and makes the next step obvious. For the owner, the same voice stays specific and calm: say what the number is and what to do, without a cold admin tone.
- **Anti-references (binding):** No playful/casual travel UI; no generic booking-site clichés (urgency banners, fake luxury gold, stock-hero search cards, amenity icon grids); no generic SaaS chrome; no cold enterprise admin dumped onto a small hospitality business.

## Evidence on Hand

- Booking details live in the database — do not invent reservation records, guest details, or availability outcomes.
- Room descriptions and homepage copy are product content — prefer stored/settings copy over fabricated marketing claims.
- Do not fabricate testimonials, reviews, press, or customer quotes.

## Product Principles

1. **The owner decides from anywhere** — Money, empty nights, the published rate, and payments that need a check are visible, and the next action is on the same site.
2. **Guests still book with confidence** — The public site keeps the room, dates, price, and next step clear.
3. **One house, one system** — Public booking, the day’s stays, and the owner’s checks share one site.
4. **Real figures** — Saved prices, recorded payments, and nights that can still be booked. Missing prices stay missing.
5. **Task clarity** — One primary job per view: what changed, what matters, what to do next.

## Accessibility & Inclusion

WCAG 2.1 AA contrast for text and controls; keyboard-operable interactive elements; visible focus states; semantic structure; `prefers-reduced-motion` respected. Booking status, availability, price changes, and errors must not rely on color alone.
