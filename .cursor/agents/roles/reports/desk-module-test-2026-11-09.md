# Desk module test — 2026-11-09

## Verdict

The cleared production dataset is structurally safe: bills, laundry, trips, menu, and stock all render a usable empty screen, and the new bill-clear rail is required in both the UI and server action. The desk is not shift-ready yet, however. A fresh bills portal can open an unusable bill with no explanation that the catalog must be created in full staff, laundry has no email fields despite the stored model and test requirement, trip slips omit the recorded pickup time, and stock adjustment wording can cause staff to add a physical count as a delta. These are training and money-control failures under interruption, not cosmetic gaps.

Review basis: code review of `app/staff`, desk components/actions/data, portals, and relevant migrations; unauthenticated live checks at `https://www.kamalaguesthouse.com`; `npm test` passed 400/400. Authenticated production mutations were not run without supplied credentials. `npx tsc --noEmit` is blocked by stale `.next/dev` generated declarations referencing missing Next.js `Prefetch` and `EnsureStatic` exports.

## Test results

| ID | Result | Severity | Evidence and fix |
|---|---|---:|---|
| B1 | **PASS** | Medium follow-up | Both staff and portal load empty arrays and `StaffDeskBills` shows “No open desk bill,” a hint, and New bill (`app/staff/bills/page.tsx`, `app/staff/portal/bills/page.tsx`, `components/staff-desk-bills.tsx:200-265`). After the wipe, however, New bill opens a tab whose item picker has zero options and no catalog/setup explanation. Add a catalog-aware empty message: full staff gets “Create menu or stock item”; portal gets “No items are set up—ask a full staff user,” and disable Add until an option exists. |
| B2 | **FAIL** | Medium | Bill creation and `?open=` navigation work (`components/staff-desk-bills.tsx:175-195`, `app/desk-actions.ts:383-395`). The default name follows the locale cookie, but a fresh portal defaults to English and the portal shell/login exposes no EN/TH switch (`lib/staff-i18n.ts:8-11`, `components/staff-portal-shell.tsx`). Thus a new Thai portal user cannot obtain the expected Thai default without a pre-existing cookie. Add the locale switch to portal login/shell or default portal sessions to Thai. |
| B3 | **PASS** | — | After a full staff user creates an item, the bill supports quantity and line-price snapshots. The clear confirmation requires exactly Cash, Thai bank, or Stripe in the UI and validates the same server-side (`components/staff-desk-bills.tsx:290-367`, `app/desk-actions.ts:488-508`). |
| B4 | **PASS** | Low follow-up | Clearing plans stock only from recipe ingredients, posts idempotent movements keyed by bill line + counted item, stores the selected rail, and displays it on cleared bills (`app/desk-actions.ts:510-536`, `lib/desk-bills.ts:73-112`, `supabase/migrate-desk-ops.sql:132-138`). UI correctly warns when lines have no recipe. Longer-term, make stock posting + bill clear one database transaction so a transient multi-step failure cannot leave a temporarily partial clear. |
| L1 | **PASS** | Medium follow-up | Full staff and sheets-only portal have actionable empty screens and valid create flows (`components/staff-desk-laundry.tsx:280-383`, `app/staff/portal/laundry/page.tsx`). Portal correctly forces `sheets` server-side (`app/desk-actions.ts:170-183`). Add confirmation before Delete; it is currently one quiet tap in the dialog footer. |
| L2 | **FAIL** | High | The create/open slip UI has no email field, update preserves no email input, and both actions hard-code `email: null`, despite the data model and validator supporting email (`components/staff-desk-laundry.tsx`, `app/desk-actions.ts:208-218,248-258`, `lib/desk-laundry.ts:30-34,125-130`). Add optional email to create/edit/detail, validate it, and preserve the stored value. |
| T1 | **PASS** | Medium follow-up | The wiped range shows an actionable empty state and Add sale accepts a free-text tour, so no catalog fixture is required (`components/staff-desk-trips.tsx:156-169,180-296`). Add a confirmation step before Remove; deleting a sale currently happens immediately. |
| T2 | **FAIL** | High | The slip page is visually readable, but it omits `pickupTime` even though the sale form records it. The selected-sale detail also omits pickup (`components/staff-desk-trips.tsx:214-231,336-366`, `app/staff/trips/slip/[id]/page.tsx:55-98`). A guest can leave with a confirmation that lacks the operational time. Show pickup time prominently on detail and slip; localize the slip or make EN/TH explicit. |
| I1 | **PASS** | Medium follow-up | Empty Menu and Stock tabs each have a primary creation action, categories survive the production wipe, and sellables can be created without counted items (`components/staff-desk-items.tsx:195-207`, `components/staff-desk-stock.tsx:234-247`, `supabase/migrate-clear-desk-demo-data.sql`). The first-run copy should teach order: “Add counted stock first if this item should deduct stock; then add the menu item and recipe.” |
| I2 | **FAIL** | High | `/staff/stock` correctly redirects to the Stock tab in All items, and movements do not invent bills. But “Adjustment” accepts an unexplained signed delta, not a physical resulting count; entering “12” when 12 are on the shelf adds 12 (`components/staff-desk-stock.tsx:250-316`, `app/desk-actions.ts:623-646`). Editing an item also rewrites `opening_quantity`, changing on-hand without an adjustment movement or audit (`components/staff-desk-stock.tsx:482-490`, `lib/desk-ops-data.ts:612-642`). Rename inputs to “Change by (+/−)” or implement “Set counted total,” and make opening quantity immutable after creation. |
| Portal bills login | **SKIP** | Medium follow-up | Live unauthenticated page loads and clearly identifies Bills portal/passcode; authenticated login was not attempted without a supplied passcode. The login page links to Laundry and full staff, but full staff navigation does not expose where to find the portals. Add a Settings/Help entry with both portal URLs and passcode ownership. |
| Portal laundry login | **SKIP** | Medium follow-up | Live unauthenticated page loads and clearly identifies Laundry portal/passcode; authenticated login was not attempted without a supplied passcode. Same discoverability fix as bills. |

## Top findings (max 7)

1. **Stock “adjustment” can double the shelf count** — Staff may enter the count they see instead of a signed delta; owner loses confidence in stock — `components/staff-desk-stock.tsx:250-316`, `app/desk-actions.ts:623-646` — Offer “Receive,” “Waste,” and “Set counted total” as distinct flows with before → after preview.
2. **Laundry slip email is missing end to end** — Staff cannot capture the promised contact field; owner has incomplete records — `components/staff-desk-laundry.tsx`, `app/desk-actions.ts:208-218` — Add and preserve optional validated email.
3. **Trip confirmation omits pickup time** — Staff can record it but the guest-facing handoff drops it; owner faces missed trips/refunds — `app/staff/trips/slip/[id]/page.tsx` — Put pickup time beside trip date and guest name.
4. **Blank catalog creates a dead-end portal bill** — Portal staff can open tabs but cannot add anything or learn who must set up items; owner accumulates empty tabs — `components/staff-desk-bills.tsx:610-710` — Detect zero options, disable Add, and show full-staff setup guidance.
5. **Fresh portal sessions default to English** — Thai staff cannot switch language at portal entry; owner pays repeated training cost — `lib/staff-i18n.ts:8-11`, `components/staff-portal-shell.tsx` — Add the same EN/TH control used by full staff.
6. **Opening quantity remains editable** — Staff can silently rewrite stock history; owner cannot distinguish setup from later correction — `components/staff-desk-stock.tsx:482-490`, `lib/desk-ops-data.ts:612-642` — Lock it after creation and require an audited movement.
7. **Money/ops records delete without confirmation** — An interrupted tap can remove laundry or a tour sale; owner loses the record — `components/staff-desk-laundry.tsx:395-416`, `components/staff-desk-trips.tsx:300-331` — Require a named confirmation and explain that deletion is permanent.

## Quick wins (≤1 day each)

- Add zero-catalog guidance in the bill dialog, with different copy for portal and full staff.
- Add pickup time to trip detail and printable slip.
- Add optional laundry email to create/edit/detail and stop writing `null`.
- Rename stock quantity to “Change by (+/−)” and show an example under Adjustment.
- Add EN/TH switching to portal login and shell.
- Confirm Laundry Delete and Trip Remove.
- First-run copy on Menu should explain stock item → menu recipe → bill clear.

## UI polish ideas

- In clear confirmation, keep rails as large tap cards and show the final amount in the selected card area; no rail should be preselected.
- In stock movement, preview `8 bottles → 20 bottles` before submit and color waste as a decrease.
- In trip add, group “Guest handoff” fields (trip date, pickup, phone) above accounting fields so interruptions do not leave the operational details last.
- In sheets portal, replace the generic “Price” prominence with the sheet counts first; payment belongs below the count.
- Use “Thai bank / PromptPay” consistently across bills and trips instead of Bills “Thai bank” versus Trips “QR.”

## Bigger bets

- Move bill stock posting and bill clearing into one database transaction/RPC while retaining the per-line/per-item idempotency key.
- Add a short “Desk setup” checklist for an empty production catalog: counted items → menu recipes/prices → portal handoff/passcodes.
- Replace destructive deletion of money records with void/cancel plus actor and reason.

## Out of scope / ignored

- No production records were created merely to populate the wiped database.
- No full-staff or portal passcodes were supplied, so authenticated live mutations and visual tablet walkthroughs are marked SKIP rather than inferred.
- Guest booking, Finance reconciliation, and Home attention behavior were not reviewed except where desk actions revalidate them.
- The unrelated generated `.next/dev` type errors were recorded but not modified.
