# Usability revision 1 — quiet desk saves

**Date:** 2026-11-07  
**Scope:** Bills, stock, laundry, menu, expenses after quiet-save ship  
**Status:** Fixes implemented; awaiting confirmation before revision 2

## Test method

Code-backed usability review (usability-tester role) against weekly scenarios + quiet-save / Expenses-under-Desk use cases. No live tablet run this pass.

## Findings → fixes

| Sev | Finding | Fix shipped |
|---|---|---|
| P0 | Header/portal **New bill** soft-URL never opened dialog | `StaffNewBillButton` → `router.push(?open=)` |
| P1 | Laundry add did not open slip | Create `onSuccess` → `setSelectedId(id)` |
| P1 | Expenses landed on month | Default + sidebar → **Today** (`view=day`) |
| P1 | `/bills/new` full-page busy redirect | Quiet `createBill` + `router.push` |
| P2 | Dialog focused Close first | Focus first field in dialog body |
| P2 | Patch note said Expenses under Money | Corrected to Desk |

## Updated scenarios

See [weekly-desk-scenarios.md](weekly-desk-scenarios.md) — scripts 1–8 reflect quiet saves, Today expenses, laundry auto-open, Desk nav.

## Re-test after deploy

1. Header New bill → dialog opens on new id  
2. Laundry add → dialog opens → status save  
3. Desk → Expenses → Today list without extra click  
4. Type bill name + Add line — no full-screen Saving overlay  
5. Portal New bill / `/portal/bills/new` still opens a tab  

## Proposed revision 2 (after your OK)

- Live tablet pass of scripts 1, 2, 3, 6  
- Dual-submit race on bill rename + add line  
- Hardcoded EN “Date” on bills → i18n  
- Unify empty-state vs header New bill open helpers  
- Optional: optimistic expense row before refresh  

**Stop here — confirm to continue revision 2.**
