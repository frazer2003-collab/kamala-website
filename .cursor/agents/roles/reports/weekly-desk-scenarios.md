# Weekly desk scenarios checklist

Source: usability revision loop. Rev 4 — portal laundry/shell i18n; keep drop+retry mutex (2026-11-07).

**Run order:** fixtures → 12 → 16 → 21 → 17 → 18 → 19 → 3b → 8 → 9 → 20 → extras.

**Fixtures:** counted item above minimum (unit e.g. `ml`); menu sellable with that ingredient + cost; one recipe-less sellable; one low-stock item; portal passcodes configured.

| Scenario | Steps | Expected | Risk |
|---|---|---|---|
| **1. Bill quiet lifecycle** | Header New bill → rename → add → price 0 → Clear | Quiet; clear closes; stock cuts if recipes | Low |
| **2. Expense Today** | Desk → Expenses Today → add → remove | Quiet; sticky total | Low |
| **3a. Laundry bag tracking** | Add slip → list only → status via row | No auto-open | Low |
| **3b. Laundromat invoice** | Laundry → Expenses link → charge | Money on Expenses | Low |
| **4–5. Stock / Menu** | Counted + purchase; item + category | Quiet saves | Low–Med |
| **6. Interrupt no overlay** | Type name → Add | No full-screen busy; only Add pending | Low |
| **7. Nav Expenses under Desk** | Sidebar | Desk; Today | Low |
| **8. Portal bills** | Portal login → New bill → add; try `/staff/stock` | Quiet add; stock blocked; chrome EN/TH | Med — auth |
| **9. Clear → stock** | Clear bill with recipe → Stock | Headroom drops | High if no ingredients |
| **10–11. EN↔TH / Home** | Locale; open bill + low stock | Chrome flips; attention lists | Portals: cookie locale |
| **12. Dual-submit race** | Save + Add ~300ms | Second blocked; retry after unlock | Med |
| **13. Empty vs header New bill** | Both CTAs | Same `?open=` | Low |
| **14. TH bills chrome** | Locale TH | วันที่; Opening/Adding TH | Low |
| **15. Clear vs in-flight add** | Add pending → Clear | Clear waits | Med |
| **16. Mutex honest labels** | Add pending → watch Save | Save disabled, still **Save** | Low |
| **17. TH default bill name** | TH → New bill | **บิลใหม่** in dialog/Home | Low |
| **18. Expenses pending TH** | TH → Save expense | **กำลังบันทึก…** | Low |
| **19. Portal laundry chrome TH** | Portal laundry + TH locale | Title/intro + Sheets/Log out Thai | Low after rev4 |
| **20. Clear empty-recipe warn** | Bill with recipe-less line → Clear confirm | Warn `{n}`; those lines don’t cut stock | Med — mixed fixture |
| **21. Dual-submit retry path** | Save then Add (dropped) → wait → Add again | Second Add posts; Save never showed Adding… | Low |

## Policy

- **No submit queue** — drop+retry; revisit only if live tablet shows repeated missed Adds after staff see disabled controls.
- Optimistic expenses remain deferred.

## Rev 4 re-test focus

- 19: portal laundry + shell i18n
- 21: document drop+retry after honest labels
- 8 / 9 / 20: live with fixtures when available
