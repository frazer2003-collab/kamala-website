# Weekly desk scenarios checklist

Source: usability revision loop. Quiet saves + Expenses under Desk (2026-11-07).

**Run order:** fixtures → 1 → 6 → 2 → 3 → 4 → 5 → extras.

**Fixtures:** counted item above minimum (unit e.g. `ml`); menu sellable with that ingredient + cost; one low-stock item; portal passcodes configured.

| Scenario | Steps | Expected | Risk |
|---|---|---|---|
| **1. Bill quiet lifecycle** | `/staff/bills` → header **New bill** → dialog opens on new id → rename + Save (button pending only) → add menu → add stock + price → set line price **0** + Save → Clear | Dialog opens from header; no full-page busy on micro-saves; 0 allowed; clear closes; stock cuts if recipes | Med — dual-submit race if rename + add both in flight |
| **2. Expense Today** | Sidebar **Desk → Expenses** → lands Today → add charge → see row + range total → Remove | Quiet save/remove; sticky total updates; no overlay | Low |
| **3. Laundry status** | `/staff/laundry` → add slip → **dialog opens** → change status → Save | Auto-open after create; button pending only; list shows new status | Low |
| **4. Stock counted + purchase** | Stock → add counted (`ml`, cost/sell) → Save → Receive purchase | Quiet create + movement; on hand updates | Low–Med — whole qty only |
| **5. Menu + category** | Items → create cost+sell+category → Categories → add | Quiet saves; new category in item select | Low |
| **6. Interrupt no overlay** | Open bill → type name → Add line quickly | **No** full-screen busy; only Add shows “Adding…” | Low |
| **7. Nav Expenses under Desk** | Scan sidebar | Expenses under Desk (not Money); opens Today | Low |
| **8. Portal bills** | Portal login → New bill → add line; try `/staff/stock` | Bill opens; quiet add line; stock blocked | Med — `/portal/bills/new` auto-open path |
| **9. Clear → stock** *(carry)* | Clear bill with recipe → Stock | Headroom drops | High if no ingredients |
| **10. EN↔TH** *(carry)* | Locale toggle on full staff | Desk chrome flips | Portals: no toggle |
| **11. Home signals** *(carry)* | Open bill + low stock → Home | Attention lists | Ranking can bury items |

## Known blockers

| Condition | Effect |
|---|---|
| No Supabase desk config | Scenarios 1–5, 8–9 untestable |
| Menu line without ingredients | Scenario 9 false fail |
| Missing portal auth | Scenario 8 blocked |
| Header New bill without App Router `?open=` | Dialog never opens (fixed rev1: `router.push`) |

## Rev 1 re-test focus

- Header **and** portal New bill → dialog opens
- Laundry create → dialog opens with new slip
- Expenses sidebar → Today without extra click
- `/staff/bills/new` quiet create → `?open=`
- Script 6: no overlay while typing + adding
