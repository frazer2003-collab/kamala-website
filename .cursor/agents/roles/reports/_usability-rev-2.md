# Usability revision 2 — bill dialog mutex + bilingual chrome

**Date:** 2026-11-07  
**Scope:** Scripts 1, 2, 3a, 3b, 6 + known risks (dual-submit, Date i18n, New bill helpers)  
**Status:** Fixes implemented; awaiting confirmation before revision 3

## Test method

Code-backed usability-tester pass against weekly scenarios. Live tablet not run this pass.

## Script results (pre-fix → post-fix)

| Script | Pre | Post |
|---|---|---|
| 1 Bill quiet lifecycle | PASS | PASS |
| 2 Expense Today | PASS | PASS |
| 3a Laundry bag tracking | PASS | PASS |
| 3b Laundromat invoice | PASS | PASS |
| 6 Interrupt no overlay | PASS | PASS |
| 12 Dual-submit *(new)* | FAIL risk | Fixed — dialog gate |
| 13 Empty vs header New bill *(new)* | FAIL diverge | Fixed — both `router.push` |
| 14 TH bills chrome *(new)* | FAIL EN Date | Fixed — `common.date` + pending verbs |
| 15 Clear vs in-flight add *(new)* | FAIL risk | Fixed — Clear locked while busy |

## Findings → fixes

| Sev | Finding | Fix shipped |
|---|---|---|
| P1 | Rename Save + Add line could both fly; twin refresh remount risk | Shared `busyGate` ref + `dialogBusy` lock across bill dialog forms; Clear disabled while busy |
| P1 | Hardcoded EN **Date** on bills list + dialog | `t("common.date")` EN/TH |
| P1 | Empty-state New bill used soft `openBill`; header used `router.push` | Empty create → `router.push(?open=)` like header |
| P2 | Opening… / Adding… hardcoded EN | `common.opening` / `common.adding` / `common.saving` |

## New scenarios

See [weekly-desk-scenarios.md](weekly-desk-scenarios.md) — **12–15**.

## Proposed revision 3 (after your OK)

- Live tablet pass of 1, 6, 12, 13, 14, 15, 3b  
- Locale-aware default bill name (“New bill” / “บิลใหม่”)  
- Optional optimistic expense row  
- Portal script 8 + clear→stock 9 if fixtures ready  

**Stop here — confirm to continue revision 3.**
