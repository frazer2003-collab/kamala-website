# Kamala Money module test — 2026-11-09

## Verdict
**FAIL for accountant trust.** Rooms and F&B are separated clearly in both data flow and page hierarchy, and focused unit tests pass. I would still not ship the money paths to a friend’s guesthouse before fixing three high-risk gaps: the “owner-only” combined result is not owner-authorized, historical F&B cost changes when the current catalog cost changes, and expense/refund completion records can be erased or closed without a durable actor/time trail. Live browser execution was **SKIP** because the existing local Next dev server returns 500 before login (`private-next-instrumentation-client` and missing `.next/dev/fallback-build-manifest.json`).

## ID results

| ID | Result | Severity | Evidence / paths | Required fix or UI improvement |
|---|---|---:|---|---|
| F1 | **FAIL** | High | `app/staff/sold/page.tsx` labels Combined view “Owner only”, but `lib/staff-auth.ts` grants Finance to any `read_write` staff member who knows one shared sensitive passcode. The fallback is hard-coded as `3135`. Also, `app/staff/sold/page.tsx` renders F&B and Combined only inside the `rooms.length > 0` branch, so removing all configured room types hides the other business. | Add an actual owner/admin authorization claim for Combined and never ship a default passcode. Render Rooms, F&B, and Combined independently so an empty Rooms configuration cannot hide F&B. |
| F2 | **PASS** | — | `app/staff/sold/page.tsx`, `components/finance-by-source.tsx`, `components/finance-fnb-sales.tsx`, and `lib/staff-insights.ts` use separate inputs: stays/channel blocks feed Rooms; cleared desk bills feed F&B. Focused tests verify source/OTA allocation and unpriced OTA nights. | Keep the strong “Business 1 / Business 2” headers. Add a small export/accounting label to each stream so screenshots and printouts retain context. |
| F3 | **PASS** | — | `lib/staff-insights.ts` resolves stay rails independently; `lib/desk-ops-data.ts` aggregates bill rails independently; `components/finance-payment-rails.tsx` displays Cash / Thai bank / Stripe and legacy “Not tagged”. `app/desk-actions.ts` rejects bill clear without a valid rail. | Show the rail total reconciliation (`rails total = collected`) and make “Not tagged” an explicit warning, not a neutral fourth rail. |
| F4 | **PASS** | — | `app/staff/sold/page.tsx` passes the selected `fromIso`/`toIso` to rooms, expenses, and cleared-bill loaders. `lib/staff-insights.ts` clips/prorates stays to the range; focused tests pass. | Replace raw ISO ranges in F&B/Gross profit with the same human date label used by Rooms. |
| E1 | **FAIL** | High | `app/staff/expenses/page.tsx`, `components/staff-desk-expenses.tsx`, `app/desk-actions.ts`, `lib/desk-ops-data.ts`. Any authenticated staff session can add or permanently delete expenses. Delete has no confirmation, reason, soft-delete, or deletion audit; only creation stores `acted_by`. A deletion immediately rewrites owner Gross profit. | Restrict delete/void to owner/admin, use a confirmed “Void expense” flow, and preserve original amount, creator, void actor, time, and reason. Show “Used only in owner Combined view” beside the range total. |
| X1 | **FAIL** | High | `components/staff-stay-change-panel.tsx`, `app/staff/stay-change-actions.ts`, `lib/guest-stay-change-server.ts`, `components/staff-closed-refund-panel.tsx`, `app/actions.ts`. “Mark refund sent” clears `refund_due` with one tap, has no confirmation, and stores no actor/time/reference. The posted hidden refund amount controls the guest message rather than the server value. Transfer verification is a client-only checkbox; the server action records no verifier. Stripe refund execution is safer/idempotent, but the local audit trail still lacks who initiated it. | Server-read the amount; require a confirmation with destination/reference; append immutable `verified_by`, `verified_at`, `refund_sent_by`, `refund_sent_at`, amount and rail events. Never represent email dispatch as bank refund completion. |
| P1 | **PASS** | — | `app/staff/promotions/page.tsx`, `app/staff/auth-actions.ts`, `components/staff-promotion-list-item.tsx`. Mutations require calendar write access, validate dates and 1–90%, revalidate calendar/public caches, and removal has a contextual confirmation. | Add actor/time history for rate changes and show the resulting nightly price in the confirmation, not only percent off. |

## Top findings (max 7)
1. **“Owner only” is copy, not authorization** — Staff impact: any read/write staff member with the shared passcode can see Combined profit / Owner impact: payroll-level users can see owner-only profit — Evidence: `app/staff/sold/page.tsx`, `lib/staff-auth.ts` — Suggested fix: owner/admin role gate, mandatory configured passcode, and no fallback secret.
2. **Historical F&B margin is mutable** — Staff impact: changing an item’s current cost silently changes old contribution / Owner impact: closed-period gross profit is not reproducible — Evidence: `lib/desk-ops-data.ts` computes cleared-line cost from current `sellables.costSatang` rather than a line snapshot — Suggested fix: snapshot unit cost on each bill line at sale/clear and report from that immutable value.
3. **Expense deletion destroys accounting evidence** — Staff impact: an accidental tap removes the row / Owner impact: gross profit rises with no deletion record — Evidence: `components/staff-desk-expenses.tsx`, `app/desk-actions.ts`, `lib/desk-ops-data.ts` — Suggested fix: void, do not delete; confirm and audit actor/time/reason.
4. **Manual refund completion is unaudited** — Staff impact: a mistaken tap tells the guest money was sent / Owner impact: liability disappears without bank evidence — Evidence: `components/staff-stay-change-panel.tsx`, `app/staff/stay-change-actions.ts`, `lib/guest-stay-change-server.ts` — Suggested fix: confirmed completion event with server amount, rail, reference, actor and timestamp.
5. **Cleared-by is written but not available to reviewers** — Staff impact: staff cannot answer who closed a bill / Owner impact: bill rail disputes cannot be traced in the UI — Evidence: database field is written by `app/desk-actions.ts`, but `DeskBill` mapping and `components/staff-desk-bills.tsx` omit `cleared_by` — Suggested fix: map and show “Cleared by … at …” on every cleared bill.
6. **Bill clear is idempotent but not atomic** — Staff impact: a transient failure can deduct some stock while leaving the bill open until retry / Owner impact: temporary bill/stock disagreement complicates reconciliation — Evidence: `app/desk-actions.ts` writes stock movements one by one before marking the bill cleared; uniqueness prevents duplicate bill-line movement — Suggested fix: one database transaction/RPC that locks the open bill, inserts movements, and clears it.
7. **Empty Rooms can hide the other business** — Staff impact: F&B appears unavailable after room configuration removal / Owner impact: cleared sales and combined result disappear from the page despite existing data — Evidence: `app/staff/sold/page.tsx` nests all three business articles under `!noRoomsConfigured` — Suggested fix: independent empty states per business.

## Quick wins (≤1 day each)
- Remove default sensitive and portal passcodes (`3135`, `bills`, `sheets`) and fail configuration closed.
- Map `cleared_by` into `DeskBill` and show actor plus exact clear timestamp.
- Add a destructive confirmation to expense removal while implementing proper void history.
- Change “Owner only” to “Combined owner view (shared with authorized finance staff)” until role enforcement exists.
- Show a warning badge for legacy “Not tagged” rails and rail reconciliation differences.
- Use friendly, consistent range labels in Rooms, F&B, and Gross profit.

## Bigger bets
- Add immutable accounting events for bill clear, expense void, transfer verification, refund initiation/completion, and rate changes.
- Snapshot bill-line cost and close accounting periods so historical F&B contribution is reproducible.
- Move bill clear into a transactional database function with idempotency and actor metadata.
- Separate operational calendar permission from finance, refund, expense-void, and owner-profit permissions.

## Verification
- `npx tsx --test lib/staff-insights.test.ts lib/desk-expenses.test.ts lib/desk-bills.test.ts lib/payment-collected.test.ts`
- Result: **35 passed, 0 failed**.
- Live UI: **SKIP**. `/staff/sold` redirected to login, then the existing dev server returned HTTP 500 due to its broken Next dev build state. No live mutations were attempted.

## Out of scope / ignored
- Guest booking visual design except where it leads directly to a transfer/refund liability.
- General Stay, Desk, accessibility, and bilingual checks assigned to other reviewers.
- Existing unrelated working-tree changes; no product code was edited and no commit was made.
