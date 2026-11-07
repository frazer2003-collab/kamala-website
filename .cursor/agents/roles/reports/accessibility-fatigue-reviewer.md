# Accessibility & fatigue reviewer — report

Source: [Accessibility fatigue reviewer](e777cb3a-3d50-422c-a9ae-850124843d95)

## Verdict

Basics OK (focus rings, Escape, reduced motion). Hour-six cost: 4s bill refresh mid-edit, no dialog focus trap, Clear without confirm, combo listbox gaps, muted tiny status chrome.

## Top findings
1. Bills poll every 4s while editing.
2. StaffDialog Escape but no focus trap/restore.
3. Clear bill one tap, no confirm.
4. StaffCombo incomplete for keyboard/SR.
5. Whole `tr role=button` oddities.
6. Tiny muted chrome + cleared chips.
7. Destructive actions hide in scroll (foot not sticky).
