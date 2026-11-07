# Kamala usability review — shared context

Use this with every role agent under `.cursor/agents/roles/`.

## Product

Kamala is a small guesthouse staff + owner web app (Thailand, Asia/Bangkok). Staff run the desk; the owner wants morning trust without standing at reception.

**Shipped staff surfaces (main app):** Home attention cards, Reservations/calendar/doors, Transfers, Desk tools — Bills (live open tabs, menu + stock lines, clear → stock), Stock (on hand / minimum / headroom), Laundry, Menu items (recipes), EN/TH staff language, desk portals (`/staff/portal/login`: bills + sheets-only laundry).

**Users**
- Desk staff: often trained in one sitting; interruptible; laptop/tablet; may prefer Thai.
- Owner: setup once, then reads outcomes (open tabs, low stock, money, doors) more than doing POS work.

**Principles**
- Training time is the cost. Screens should be explainable by pointing.
- Owner reads a result; staff do the task.
- Money in satang; stock moves when a bill clears, once.
- Guest site is separate; do not confuse guest booking UX with desk ops.

## Review ground rules

- Prefer evidence from code, copy, and flows under `app/staff`, `components/staff-*`, `lib/desk-*`, `lib/staff-*`.
- Separate **staff** vs **owner** impact in every finding.
- No speculative rewrites of booking/guest unless the role explicitly covers trust/money.
- Output is recommendations and ranked work — do not implement unless asked.

## Standard output format

```markdown
## Verdict
One paragraph.

## Top findings (max 7)
1. **Title** — Staff impact / Owner impact — Evidence — Suggested fix

## Quick wins (≤1 day each)
- …

## Bigger bets
- …

## Out of scope / ignored
- …
```
