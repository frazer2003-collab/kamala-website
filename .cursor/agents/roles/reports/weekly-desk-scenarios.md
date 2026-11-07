# Weekly desk scenarios checklist

Source: [usability-tester.md](usability-tester.md).

**Run order:** fixture stock/items → 1 → 2 → 6 → 5 → 3 → 4 → extras.

**Fixtures:** counted item above minimum; menu sellable with that ingredient; one low-stock item; one open bill. Portal passcodes configured (`STAFF_PORTAL_*` or defaults).

| Scenario | Steps | Expected | Risk |
|---|---|---|---|
| **1. Open bill lifecycle** | Staff login → `/staff/bills` → **New bill** → dialog opens → rename + room → **Save** → add **menu** sellable → add **stock:** counted item → remove one line → watch totals | Live open tab; name/room persist; lines + totals update; removed line gone | Medium — refresh races; rename needs Save; needs catalog |
| **2. Clear bill → stock** | Note Stock headroom for recipe ingredient → open bill with that line → **Clear bill** → `/staff/stock` | Bill cleared; `bill_sale` movements; headroom drops; Home low-stock may flip | **High** — no ingredients ⇒ clear OK, stock unchanged |
| **3. Bills portal isolation** | `/staff/portal/login?portal=bills` → passcode → create bill, add line → try `/staff/stock`, `/staff/transfers`, `/staff/home` by URL | Portal bills only; unrelated tools redirect; cannot write stock/items | Low–Med — test with portal cookie only |
| **4. Laundry sheets portal** | `/staff/portal/login?portal=laundry` → passcode → add slip | Category fixed `sheets`; list sheets-only; create stored as sheets | Low |
| **5. EN → TH → EN** | Full staff shell → sidebar locale → TH → reload → EN → reload | Nav/desk keys Thai then English; `lang` flips | **High on portals** (no toggle); Med full desk — mixed hardcoded EN |
| **6. Home open bills / low stock** | ≥1 open bill + ≥1 item `headroom≤0` → `/staff/home` | Attention (or remaining) cards show open-tab + low-stock with links | **High** — top-3 attention can hide bills/stock |
| **7. Full laundry (staff)** *(extra)* | `/staff/laundry` → categories `laundry` + `sheets`, statuses | Both categories selectable; open slips can hit Home laundry | Low |
| **8. Stock receive** *(extra)* | `/staff/stock` → purchase/waste/adjustment | On hand/headroom update; portal cannot do this | Med — staff session only |
| **9. Portal cross-kind** *(extra)* | Bills portal cookie → open `/staff/portal/laundry` | Redirect to laundry portal login (kind mismatch) | Low |

## Known blockers

| Condition | Effect |
|---|---|
| No Supabase desk config | Scenarios 1–2, 6 untestable |
| ≥3 higher Home attentions | Scenario 6 false fail |
| Portal-only session | Scenario 5 untestable on portal |
| Menu line without ingredients | Scenario 2 false fail |
| Missing portal auth | Scenarios 3–4 blocked |
