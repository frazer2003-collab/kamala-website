# Kamala Stay module test — 2026-11-09

## Verdict

Code-walk and focused regression coverage are strong: calendar bed prefixes, door conflicts, Home deep-clean ordering, reservation sorting/filtering, and message reply actions are implemented coherently. The Stay slice has **two major usability failures** and **one minor broken link**: Home “Needs reply” does not open the selected thread, EN/TH coverage is incomplete across Home and Calendar, and Home’s newest patch-note link points to a route that does not exist. Live staff pages correctly redirected to sign-in and the portal login rendered, but no credentials or safe booking fixture were available, so authenticated and destructive live actions were not run against real bookings.

## Top findings

1. **Home “Needs reply” loses the selected thread — FAIL / major** — Staff land on Messages but must find the guest again; owner impact is slower response handling. `components/staff-home-board.tsx` links with `?booking=…`, while `app/staff/messages/page.tsx` and `components/staff-messages-list.tsx` only read `?open=…`. Change the Home href to `/staff/messages?open=${encodeURIComponent(thread.bookingId)}` and add a small route/query test.
2. **TH mode leaves core Stay work in English — FAIL / major** — Staff switching to Thai see translated navigation and some table chrome, but Home board headings/copy and much of Calendar remain hard-coded English. Evidence: `app/staff/home/page.tsx`, `components/staff-home-board.tsx`, `app/staff/calendar/page.tsx`, `components/calendar-booking-panel.tsx`; the phrases are absent from `lib/staff-i18n.ts`. Move operational labels to keyed `staffT`/`t` entries. Keep the existing hard reload/restore behavior in `components/staff-locale.tsx`.
3. **Home patch-note link is broken — FAIL / minor** — Staff cannot reach the newest note from Home. `app/staff/home/page.tsx` points to `/staff/whats-new`, but the shipped page is `app/staff/home/patch-notes/page.tsx`. Point Home to `/staff/home/patch-notes` or add a deliberate redirect route.
4. **Housekeeping save failures are silent — polish / minor** — `app/staff/home-actions.ts` logs Supabase errors, while `components/staff-home-board.tsx` refreshes without telling staff. Return an action result and show a compact inline error so “Cleaned” never appears to do nothing.
5. **Stay interaction logic has useful regression coverage — PASS** — `lib/calendar-timeline-bars.test.ts`, `lib/calendar-door-drop.test.ts`, `lib/staff-home-board.test.ts`, `lib/staff-reservations.test.ts`, and `lib/bed-setup.test.ts` cover the highest-risk pure behavior. The repository test run completed with 400 passing tests and 0 failures.

## Scenario checklist

| Scenario | Status | Severity | Steps | Expected / result | Evidence and concrete fix |
|---|---|---:|---|---|---|
| S0.1 | SKIP | — | Open `/staff/login`; sign in | Live login rendered. No credentials were available, so landing on Home was not verified. | Live `https://www.kamalaguesthouse.com/staff/login`; `app/staff/login/page.tsx`. Retest with a non-production staff fixture. |
| S0.2 | PASS | — | Inspect Stay / Desk / Money navigation and active state | Groups and links are present; current item uses `aria-current="page"`. Notifications are absent from Stay. | `components/staff-sidebar.tsx`. |
| S0.3 | **FAIL** | **major** | Switch EN → TH → EN | Toggle/restore mechanism is present, but core Home and Calendar labels do not all switch to Thai. | `components/staff-locale.tsx`, `lib/staff-i18n.ts`, `components/staff-home-board.tsx`, `app/staff/calendar/page.tsx`. Key all Stay operational copy. |
| S0.4 | SKIP | — | Sign out; use passcode portal; try full staff URLs | Live portal login rendered and unauthenticated `/staff/home` redirected to `/staff/login?next=%2Fstaff%2Fhome`. Passcode success and sign-out were not testable without credentials. | Live `/staff/portal/login`; staff route guard. Retest with dedicated portal and staff accounts. |
| H1 | PASS | — | Open `/staff/home` | Code renders bank, check-in, check-out, tours, deep clean, messages, and latest patch note. | `app/staff/home/page.tsx`, `components/staff-home-board.tsx`, `lib/staff-home-board.ts`. |
| H2 | PASS | — | Open a bank hold; confirm or reject | Code-walk: eligible website bank holds open the decision panel; transfer verification gates confirmation and confirm/decline actions are wired. Not mutated live because bookings are real. | `lib/staff-home-board.ts`, `components/staff-request-decision-panel.tsx`, `app/actions.ts`. |
| H3 | PASS | — | Mark a deep clean “Cleaned” | Success path persists today, keeps the row, greys it, and sorts it below due rows. Regression test passes. | `app/staff/home-actions.ts`, `lib/staff-home-board.ts`, `lib/staff-home-board.test.ts`. Add visible failure feedback. |
| H4 | **FAIL** | **major** | Select a “Needs reply” row | Messages opens without the selected thread because Home sends `booking`, while Messages expects `open`. | `components/staff-home-board.tsx`, `app/staff/messages/page.tsx`. Rename query parameter to `open`. |
| H5 | **FAIL** | **minor** | Select the Home patch-note link | Home links to missing `/staff/whats-new`; actual route is `/staff/home/patch-notes`. The referenced image exists. | `app/staff/home/page.tsx`, `app/staff/home/patch-notes/page.tsx`, `public/staff/patch-notes/desk-ops.jpg`. Fix href or add redirect. |
| C1 | PASS | — | Open Calendar month/range | Code loads door rows, days, bookings, blocks, inventory, rates, and timeline bars; range tests pass. Authenticated live render was not available. | `app/staff/calendar/page.tsx`, `components/staff-timeline-calendar.tsx`, `lib/calendar-timeline.ts`. |
| C2 | PASS | — | Inspect a stay with `bed_setup` | Both room and door bar builders call `formatCalendarGuestLabel`; test confirms `TWN Somchai`. | `lib/bed-setup.ts`, `lib/calendar-timeline.ts`, `lib/calendar-timeline-bars.test.ts`. |
| C3 | PASS | — | Open a stay and inspect editable guest, bed, and paid rail | Editable guest details, TWN/DBL, payment state/rail, room, dates, total, and staff note are wired for manageable stays. | `components/calendar-stay-dialogs.tsx`, `components/calendar-booking-panel.tsx`, `app/actions.ts`. |
| C4 | PASS | — | Select empty door-day; complete new booking; Ctrl+Enter | Empty-day flow mounts the walk-in form; global Ctrl/⌘+Enter requests submit, Esc returns, and required bed/payment validation is present. | `components/calendar-day-panel.tsx`, `components/calendar-walk-in-form.tsx`, `app/actions.ts`. |
| C5 | PASS | — | Drag a stay to another door and attempt a conflict | Planner supports assign/swap/replace/unassign and rejects ineligible/conflicting doors; pure regression tests pass. | `components/calendar-door-dnd.tsx`, `lib/calendar-door-drop.ts`, `lib/calendar-door-drop.test.ts`, `app/actions.ts`. |
| C6 | PASS | — | Cancel paid Cash, Thai bank, Stripe, and OTA stays | UI and action branches distinguish cash/OTA close, Thai-bank Transfers handoff, and immediate Stripe refund while retaining the bank charge. | `components/calendar-booking-panel.tsx`, `app/actions.ts`, `lib/payment-collected.ts`. |
| R1 | PASS | — | Open `/staff/reservations` | Table includes Bed, Guest, Stay, Booked, Room, Source, Payment, Status; rows combine website and OTA stays. | `app/staff/reservations/page.tsx`, `components/staff-desk-reservations.tsx`, `lib/staff-reservations.ts`. |
| R2 | PASS | — | Sort Booked descending | Default is Booked descending and uses full `created_at`, so same-day rows sort newest first; regression test passes. | `lib/staff-reservations.ts`, `lib/staff-reservations.test.ts`. |
| R3 | PASS | — | Filter by payment and source | Source chips and payment select feed server-side filters; matching behavior is covered by tests. | `components/staff-desk-reservations.tsx`, `lib/staff-reservations.ts`, `lib/staff-reservations.test.ts`. |
| M1 | PASS | — | Open `/staff/messages` | Threads sort newest first and `needs-reply` rows receive attention styling, pill, and status copy. | `app/staff/messages/page.tsx`, `components/staff-messages-list.tsx`, `lib/booking-chat.ts`. |
| M2 | PASS | — | Open a thread; send a reply; check internal note path | Reply action saves the message, updates reply status, optionally emails the guest, and supports Ctrl/⌘+Enter. Internal staff notes remain editable on the Calendar stay rather than being mixed into guest chat. | `components/booking-chat.tsx`, `app/chat-actions.ts`, `lib/booking-chat.ts`, `components/calendar-booking-panel.tsx`. |

## Quick wins

- Fix the two href/query mismatches: `booking` → `open`, and `/staff/whats-new` → `/staff/home/patch-notes`.
- Add focused tests for the Home-to-Messages deep link and Home patch-note destination.
- Add keyed Thai strings for the six Home section headings and their empty states first; then key Calendar dialog controls.
- Surface a small inline Home error when marking a clean fails.

## Bigger bets

- Replace DOM phrase substitution gradually with keyed Stay copy. This reduces partial translations and makes EN → TH → EN deterministic without changing the current Kamala visual language.
- Add a non-production staff account plus seeded booking fixture for weekly browser regression. Keep destructive scenarios isolated from live bookings.

## UI polish opportunities

- Keep Home as one flat ops board with compact rows and dividers; do not reintroduce old open-bill/low-stock cards or add purple status tiles.
- Use the existing muted grey treatment for completed cleans, but add a short success/error status beside the row so staff receive immediate feedback.
- Truncate long Home message previews consistently with the Messages list so guest text does not dominate the scan line.
- On Calendar, keep payment rails as plain radio controls and the current restrained status colors; avoid additional card containers around each field group.

## Likely failing or currently untestable

- **Likely failing now:** S0.3, H4, H5.
- **Untestable live in this run:** S0.1 and the authenticated portion of S0.4. All authenticated Stay pages were gated correctly, but no staff/passcode credentials were available.
- **Not run destructively on live:** H2, H3, C3–C6, and M2 because live bookings are real. Their PASS ratings are code-walk/test based.

## Out of scope / ignored

- The former Home open-bills/low-stock scenario is obsolete for this Stay plan: current product context defines Home as bank, in/out, tours, deep clean, and messages.
- Desk catalog state was not treated as a Stay failure; the demo catalog wipe is intentional.
- No booking, message, housekeeping, door, payment, or refund record was changed.
- No commits or pushes were made.
