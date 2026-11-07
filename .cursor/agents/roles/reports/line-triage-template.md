# LINE desk triage — paste card + decision tree

Source: [support-triage-bot.md](support-triage-bot.md).

Pin **surface + login mode + locale + last irreversible action** (especially Clear) before debugging.

## Paste-ready LINE card

```
KAMALA DESK TRIAGE
When: (Bangkok date/time)
Who: (staff name)
Phone/device: (laptop / tablet) · browser:

1) Surface (pick one)
[ ] Full staff  URL: /staff/…
[ ] Bills portal  /staff/portal/bills
[ ] Laundry portal  /staff/portal/laundry
[ ] Other: ________

2) Login mode
[ ] Full staff login (/staff/login)
[ ] Portal passcode (bills / laundry)
Opened how? [ ] already in staff  [ ] bookmark/new tab  [ ] LINE/link from outside

3) Language: [ ] EN  [ ] TH   (sidebar EN/TH)

4) What they were doing (last tap)
Action: ________
Bill name/room (if any): ________
Bill status: [ ] open  [ ] cleared  [ ] unknown
Item added: menu / stock / n/a

5) Expected → Actual
Expected: ________
Actual: ________
Error text (copy exact): ________

6) Attach
[ ] Screenshot of FULL screen (URL bar + sidebar/portal header visible)
[ ] 2nd shot after refresh (if still wrong)

Owner next question (one only): ________
```

**Screenshot checklist:** URL bar · sidebar or “Desk portal” header · EN/TH · bill/laundry/stock status · exact error · whether Clear was pressed · open-how (in-app vs external).

## Short decision tree

```
“It doesn’t work”
        │
        ├─ Can’t log in / kicked out?
        │     ├─ Portal URL? → bills vs laundry passcode (wrong portal = fail)
        │     ├─ Full staff + opened from bookmark/LINE/new tab? → expected re-login
        │     └─ Idle ~30 min? → re-login; then retry
        │
        ├─ Bills?
        │     ├─ Can’t add Stock/Menu catalog edits? → need FULL staff (not portal)
        │     ├─ Item missing in list? → Menu items recipes / active flags (full staff)
        │     ├─ Stock didn’t drop after sale?
        │     │     ├─ Bill still OPEN? → expected (moves only on Clear)
        │     │     └─ CLEARED? → check Stock recent movements (bill_sale)
        │     └─ List “jumps”/stale lines? → live refresh ~4s; compare after refresh
        │
        ├─ Stock wrong / low card?
        │     ├─ On portal? → switch to full /staff/stock
        │     ├─ After bill clear? → bill_sale movement
        │     └─ Else → purchase / waste / adjustment not recorded
        │
        ├─ Laundry?
        │     ├─ Portal + not sheets? → use full /staff/laundry
        │     └─ Status/note? → slip popup on full or portal sheets
        │
        ├─ Language wrong? → sidebar EN/TH; confirm cookie; re-screenshot
        │
        └─ Calendar/reservations edit blocked?
              └─ read-only access or sensitive Finance/Settings passcode path
```

**Footguns to name in replies:** Add item ≠ stock move; Clear posts `bill_sale` once; laundry portal sheets-only; external `/staff` open forces fresh login; live bill polling ~4s.
