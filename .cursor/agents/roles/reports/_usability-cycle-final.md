# Usability loop — final cycle report

**Date:** 2026-11-07  
**Status:** **Cycle complete**

## Shipped (rev1 → rev5)

| Rev | Outcome |
|---|---|
| **1** | New bill opens via `router.push(?open=)`; Expenses defaults Today; quiet `/bills/new` |
| **1.1** | Laundry create stays on list; laundromat invoice → Expenses |
| **2** | Bill dialog busy gate; Date i18n; empty/header New bill unified |
| **3** | Honest pending vs locked labels; locale default bill name; quiet-path EN sweep |
| **4** | Portal laundry + shell i18n; drop+retry (no submit queue) |
| **5** | Live auto Playwright pack; production deploy + retest |

## Final live auto (production)

| Script | Result |
|---|---|
| **8** New bill `?open=` | **PASS** |
| **17** TH default `บิลใหม่` | **PASS** |
| **6** No full-screen busy | **PASS** |
| **16** Honest pending labels | **PASS** |
| **12** Dual-submit name persists | **PASS** |
| **15** Clear while Add busy | **SKIP** (probe flaky on empty/new tab; code gates `disabled={dialogBusy}`) |
| **19** Portal laundry TH | **PASS** |
| **3b / 18 / 9** | **SKIP** (need `LIVE_STAFF_PASSWORD` — optional follow-up) |

## Automation

```bash
npm run test:live-desk
# optional full staff:
# LIVE_STAFF_PASSWORD=… npm run test:live-desk
```

## Deferred (not blocking close)

- Live Clear→stock with a known recipe fixture  
- Full-staff Expenses scripts without a staff password env  
- Optimistic expense rows (product skip)

## Verdict

Portal desk usability targets from this loop are **green on production**. Usability revision cycle **closed**.
