# Trust & money reviewer — report

Source: [Trust money reviewer](3c502377-462d-4d7f-9b80-1f7a7d68e9aa)

## Verdict

Do not ship portals/clear-bill as-is: weak defaults (`bills`/`sheets`/`3135`), 12h portal sessions, one-tap irreversible clear + stock, no actor audit. Transfers stronger but read-only still sees confirm UI.

## Top findings
1. Default portal / sensitive passcodes are ship blockers.
2. Bills portal 12h, no idle, full clear power.
3. Clear bill one tap, irreversible, no confirm.
4. No actor on clears or stock adjustments.
5. Clear not one DB transaction.
6. Transfers: write gate good; UI ignores read-only.
7. Stock waste/adjust one submit, no actor/confirm threshold.
