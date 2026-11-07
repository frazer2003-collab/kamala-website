# Usability revision 3 — locale names + honest mutex

**Date:** 2026-11-07  
**Scope:** Scripts 1, 6, 12–15, 3b, 8, 9 + rev3 polish candidates  
**Status:** Fixes implemented; awaiting confirmation before revision 4

## Test method

Code-backed usability-tester pass. Live tablet not run (no local session in this loop). Optimistic expense rows **skipped** (refresh is enough; rollback risk > value).

## Script results

| Script | Result | Notes |
|---|---|---|
| 1 Bill quiet lifecycle | PASS* | *fixtures for stock cut |
| 6 Interrupt no overlay | PASS | Honest locked labels now |
| 12 Dual-submit | PASS (drop+retry) | Gate still drops second click; siblings disable without fake pending — script 12/16 updated |
| 13 Empty vs header | PASS | Unchanged from rev2 |
| 14 TH bills chrome | PASS | + portal header |
| 15 Clear vs in-flight | PASS | Unchanged |
| 3b Laundromat → Expenses | PASS | Unchanged |
| 8 Portal bills | PASS* | Chrome i18n shipped; *auth fixtures |
| 9 Clear → stock | PASS (code) | planBillClear |

## Findings → fixes

| Sev | Finding | Fix shipped |
|---|---|---|
| P0/P1 | Mutex painted sibling controls as Saving/Adding | `DeskQuietForm` passes `(pending, locked)`; labels use **pending only**; buttons `disabled={pending \|\| locked}` |
| P1 | Default bill name always EN | `createBill` → `staffT(locale, "bills.new")` |
| P1 | Portal bills + Opening bill… + Removed item / set price EN | `staffT` / new bills.* keys |
| P1 | Expenses (and laundry/stock/items) default Saving… | Pass `t("common.saving")` |
| P2 | Name/room keys remount on server value change | Key on `selected.id` only |
| — | Optimistic expense row | **Skipped** |

## Product note on script 12

Reception mutex **blocks** a second submit rather than queuing it. Safer than twin refreshes; staff retry once the first finishes. Scenarios **12** and **16** document that.

## New scenarios

**16** Mutex honest labels · **17** TH default bill name · **18** Expenses pending TH — see [weekly-desk-scenarios.md](weekly-desk-scenarios.md).

## Proposed revision 4 (after your OK)

- Live tablet pass of 12, 16, 17, 18, 3b, 8  
- Optional submit **queue** if staff still miss the second action in rush  
- Portal laundry header i18n parity  
- Scenario 9 live with recipe fixtures  

**Stop here — confirm to continue revision 4.**
