# Usability revision 4 — portal laundry/shell i18n

**Date:** 2026-11-07  
**Scope:** Scripts 12, 16, 17, 18, 3b, 8, 9 + portal laundry chrome + submit-queue decision  
**Status:** Fixes implemented; awaiting confirmation before revision 5

## Test method

Code-backed usability-tester pass. Live tablet still needed for portal auth (8) and recipe clear→stock (9/20).

## Script results

| Script | Result | Notes |
|---|---|---|
| 12 Dual-submit | PASS | Drop+retry; queue skipped |
| 16 Honest labels | PASS | Unchanged from rev3 |
| 17 TH default name | PASS | Unchanged |
| 18 Expenses pending TH | PASS (code) | Unchanged |
| 3b Laundromat → Expenses | PASS | Unchanged |
| 8 Portal bills | PASS* | *live auth |
| 9 Clear → stock | PASS (code) | *live recipe fixture |
| 19 Portal laundry chrome | FAIL → **fixed** | Header + shell i18n |

## Findings → fixes

| Sev | Finding | Fix shipped |
|---|---|---|
| P1 | Portal laundry header hardcoded EN | `staffT` title + `laundry.portalIntro` |
| P1 | Portal shell Sheets/Bills/Sign out EN | `useStaffLocale` — brand keys + `nav.logout` |
| P2 | Quiet form “Could not save.” EN | `common.couldNotSave` |
| P2 | Stock note / items search placeholders EN | `stock.reason` / `desk.typeToSearch` |
| — | Submit **queue** | **Skipped** — drop+retry safer than queued stale form |

## Product decision

Keep mutex as **block second click**. Queue would re-fire after refresh on possibly stale fields. Revisit only after live rush evidence.

## New scenarios

**19** Portal laundry chrome TH · **20** Clear empty-recipe warn · **21** Dual-submit retry path — see [weekly-desk-scenarios.md](weekly-desk-scenarios.md).

## Proposed revision 5 (after your OK)

- Live tablet: 12, 16, 17, 19, 21, 8, 9/20  
- Home attention meta bilingual (laundry category/status codes) if still raw  
- Stop loop if live pass is clean — or one more polish rev only on live fails  

**Stop here — confirm to continue revision 5.**
