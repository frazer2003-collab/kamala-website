# Usability revision 5 — live auto (production portal)

**Date:** 2026-11-07
**Base:** https://www.kamalaguesthouse.com
**Summary:** 3 pass · 2 fail · 5 skip/warn

| Script | Result | Notes |
|---|---|---|
| 8 | **PASS** | New bill opened with ?open=; quiet (no full-page busy observed) |
| 6 | **PASS** | No full-page busy overlay during Save+Add |
| 16 | **FAIL** | Sibling pending bleed on production: [{"text":"Saving…","disabled":true},{"text":"Adding…","disabled":true}] (rev3 honest labels not deployed) |
| 12 | **PASS** | Name persisted after dual-submit (Auto live mw66xn7f); Clear disabled mid-add=null |
| 15 | **WARN** | Clear disabled=null during race |
| 19 | **FAIL** | Portal laundry still EN on production: h1="Laundry" intro="This portal records sheet laundry only." brand="Sheets" logout="Sign out" (rev4 not deployed) |
| 3b | **SKIP** | Expenses needs full staff login — portal-only auto run |
| 17 | **SKIP** | TH default bill name needs staff locale + createBill deploy |
| 18 | **SKIP** | Expenses pending TH needs full staff |
| 9 | **SKIP** | Clear→stock needs recipe fixture + stock page (full staff) |

## Notes

- Ran via `scripts/live-desk-usability.mjs` (headless Playwright) — no click-by-click Cursor approvals.
- Production may lag uncommitted rev2–4 fixes; FAILs tagged when deploy is the gap.
- Full staff scripts (3b, 9, 17, 18) need staff session — skipped in portal-only auto.

**Stop — confirm to deploy local fixes to production and re-run, or continue portal-only.**
