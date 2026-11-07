# Cross-role convergence (12/12 complete)

All role reports are in this folder. Prompts: `../`.

## Ship-first (money / trust)
1. **Require strong portal + sensitive passcodes** — no `bills`/`sheets`/`3135` defaults in prod ([Trust money reviewer](3c502377-462d-4d7f-9b80-1f7a7d68e9aa)).
2. **Confirm before Clear bill** — echo name, total, “stock moves once”; block empty clear.
3. **Portal session hygiene** — shorter TTL + idle logout; helper add-only or gate Clear harder than full staff.
4. **Actor on clear + stock movements** (`acted_by`); aim for atomic clear.

## Desk usability (staff)
5. Pause/slow **4s bill refresh** while dialog open; dialog **focus trap**; sticky Clear foot.
6. Finish **EN/TH** — statuses, Home cards, portal shell/login; stop phrase-walk on dynamics.
7. **Price/recipe integrity** — no silent ฿50 stock sellables; warn recipe-less clears.
8. Combos for search only; selects/segments for tiny enums; larger option targets.
9. Empty states for laundry/stock like Bills; day-one script in training report.

## Owner morning
10. Home: open bills as **count + ฿ (+ age)**; don’t bury under top-3; Today when busy; money signals without full Finance unlock.
11. **IA** — Home above groups; split Money / Site; portals off full-staff Home; door card → unassigned; portal Laundry → Sheets.

## Ops packaging
12. Printable SOP + LINE triage template (process + support reports).
13. Weekly scenario pack (usability tester) with fixtures.

## Suggested first build slice
Confirm Clear + empty-clear block + pause refresh-in-dialog + env-required portal passcodes + Home open-tab ฿. That hits the densest cross-role agreement without a full IA rewrite.
