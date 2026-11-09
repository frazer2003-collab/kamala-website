# Kamala staff module test plan — 2026-11-09

Scope: live staff desk at `/staff/*` and portals. Bookings are real; desk catalog was cleared (empty F&B/items/laundry/trips until staff re-add).

Pass = expected result. Fail = bug or blocker. Note locale (EN/TH), role (full staff vs portal), device (desk tablet ~1100×900).

---

## 0. Shared / shell

| ID | Steps | Expected |
|----|-------|----------|
| S0.1 | Open `/staff/login`, sign in | Lands on Home (or intended next) |
| S0.2 | Stay / Desk / Money nav groups | All links load; current page marked |
| S0.3 | Switch EN ↔ TH | Labels swap; no blank keys |
| S0.4 | Sign out / passcode portals | Portal login works; full staff gated |

---

## 1. Stay — Home

| ID | Steps | Expected |
|----|-------|----------|
| H1 | Open `/staff/home` | Ops board sections render (bank, in/out, tours, cleans, messages) |
| H2 | Bank to confirm (if any) | Confirm/reject without crash |
| H3 | Deep clean: Cleaned | Row greys and moves down; not deleted |
| H4 | Needs reply | Opens Messages / thread |
| H5 | Patch notes link | Newest note visible; image loads |

---

## 2. Stay — Calendar

| ID | Steps | Expected |
|----|-------|----------|
| C1 | Open calendar month/range | Door rows + bars load |
| C2 | Stay with bed set | Bar shows `TWN`/`DBL` before guest name |
| C3 | Open stay | Guest, bed, paid rail editable if allowed |
| C4 | Empty door-day | New booking form; Ctrl+Enter saves |
| C5 | Drag door | Stay moves door; conflict blocked |
| C6 | Cancel paid cash vs bank/Stripe | Correct Transfers / refund rails |

---

## 3. Stay — All bookings

| ID | Steps | Expected |
|----|-------|----------|
| R1 | Open `/staff/reservations` | Table: bed, source, booked sort |
| R2 | Sort Booked | Newest time on top same day |
| R3 | Filter payment / source | Rows match filter |

---

## 4. Stay — Messages

| ID | Steps | Expected |
|----|-------|----------|
| M1 | Open `/staff/messages` | Thread list; unanswered flagged |
| M2 | Reply | Message sends; staff note path OK |

---

## 5. Desk — F&B / Bills

| ID | Steps | Expected |
|----|-------|----------|
| B1 | Open `/staff/bills` (and portal) | Empty state clear after demo wipe |
| B2 | New bill | Opens live tab; TH default name on portal |
| B3 | Add line (after creating an item) | Qty/price; clear requires Cash/Thai bank/Stripe |
| B4 | Confirm clear | Stock moves only with recipe; bill shows rail |

---

## 6. Desk — Laundry

| ID | Steps | Expected |
|----|-------|----------|
| L1 | Open laundry / portal | Empty or list; add record |
| L2 | Open slip | Email fields present; no crash |

---

## 7. Desk — Trips

| ID | Steps | Expected |
|----|-------|----------|
| T1 | Open `/staff/trips` | Empty after wipe; can add sale |
| T2 | Preview slip | Slip page readable |

---

## 8. Desk — Items / Stock

| ID | Steps | Expected |
|----|-------|----------|
| I1 | Open `/staff/items` | Empty catalog OK; can add sellable + stock |
| I2 | `/staff/stock` | Counts/adjust without inventing bills |

---

## 9. Money — Finance

| ID | Steps | Expected |
|----|-------|----------|
| F1 | Open `/staff/sold` | Rooms book + By source/OTA + F&B book + Owner combined |
| F2 | Rooms vs F&B | No mixing of bill sales into Rooms accounts |
| F3 | Rails | Collected split Cash/Thai bank/Stripe when data exists |
| F4 | Date strip | Range changes totals |

---

## 10. Money — Expenses / Transfers / Promotions

| ID | Steps | Expected |
|----|-------|----------|
| E1 | Expenses day/week | Add/list; Gross profit links |
| X1 | Transfers | Refunds / room moves queue |
| P1 | Promotions | Edit rates without breaking calendar |

---

## 11. Settings / Gallery / AI

| ID | Steps | Expected |
|----|-------|----------|
| Z1 | Settings rooms/tours | Room rates; tour settings |
| Z2 | Gallery | Upload/list safe |
| Z3 | AI search | Page loads; no auth leak |

---

## Agent assignment

1. **Stay** — Home, Calendar, Reservations, Messages (usability + ops)
2. **Desk** — Bills, Laundry, Trips, Items/Stock (ops + portal)
3. **Money** — Finance, Expenses, Transfers (trust + money)
4. **UX / a11y** — Shell, fatigue, bilingual, tablet scanability

Each agent: run plan IDs for their module against code + live URL if creds available; return FAIL list with file paths and severity; suggest small UI fixes.
