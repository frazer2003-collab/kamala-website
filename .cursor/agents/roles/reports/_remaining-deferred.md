# Remaining deferred (desk trust / Home money)

Not shipped yet. Ops packaging lives beside this note; product work stays queued.

| Deferred | Why held | Notes |
|---|---|---|
| **Production passcode fail-closed** | Keep live working with defaults until env is set | Defaults `bills` / `sheets` / `3135` still allowed; see [_impl-slice-1.md](_impl-slice-1.md) |
| **Portal clear add-only mode** | Process SOP / Trust: helpers should not Clear | Product gate (or second pin) for portal Clear; SOP already says receptionist-only clear |
| **Atomic clear RPC** | Clear + stock not one DB transaction | Actor trail may land separately; full atomic `bill_sale` + cleared status still open |
| **Full Home money Finance teaser without passcode** | Owner morning trust without unlocking Finance | Teaser / signal on Home only — no write path, no full Finance unlock |

Related: [_convergence.md](_convergence.md) ship-first items 1, 3–4, 10.
