# Hospitality UX designer — report

Source: [Hospitality UX designer](cb8d2063-ee3b-4639-9225-82f34ac9a77b)

## Verdict

Desk operate surfaces are pointed right (list → dialog, whole-row open, bilingual labels, portals). Risk sits in irreversible one-tap clear/delete, English-hardcoded chrome on Thai sessions, and search-combos for tiny enums.

## Top findings
1. Clear bill: one primary tap, no confirm (stock side effect).
2. Destructive deletes: quiet one-shot footers.
3. Thai locale leaks English (Close, No matches, Date, Home cards).
4. Combo overused for ≤5-option enums (status/category/reason/unit).
5. Combo option hit targets small for tablet.
6. Narrow shell: stacked sidebar blocks &lt;2s status scan.
7. Stock waste/sign semantics hidden (positive qty + reason only).

## Quick wins
- i18n Close / No matches / Date / Reason / Home cards.
- Confirm before clear bill and before delete/deactivate.
- Larger combo option min-height.
- `<select>` or segments for tiny enums.
- Waste subtracts / purchase adds hint.

## Bigger bets
- Collapsed operate chrome on tablet.
- Bills as side sheet vs centered modal.
- Bilingual owner morning attention strip.
