# Staff busy veil (Kamala)

Status: approved  
Date: 2026-07-20

## Goal

When staff trigger a non-instant action (save, sync, delete, upload, decide, assign, etc.), show a soft full-page veil with a quiet spinner so the UI feels responsive and double-submits are blocked.

## Decisions

| Decision | Choice |
|---|---|
| Visual | Soft dimmed veil + centered spinner (no card/popup) |
| Scope | All logged-in staff pages |
| Sync OTA | Same soft veil (replace heavier sync popup) |
| Copy | Generic “Working…” under the spinner |
| Instant UI | No veil for open/close panels, expand Availability, typing, date picks before save |

## Approach

Shared **staff busy provider** inside a new staff shell used by logged-in staff pages:

1. Introduce `app/staff/(app)/layout.tsx` (or equivalent) that wraps authenticated staff UI in a client `StaffAppShell` owning sidebar + busy overlay.
2. `StaffBusyProvider` exposes `busy` / `setBusy` / `withBusy(promise)`.
3. Overlay mounts once at shell level when `busy > 0` (ref-count so overlapping actions stay veiled).
4. Coverage hooks:
   - **Server-action forms:** `StaffFormBusy` / submit child using `useFormStatus()` calls into the provider while `pending`.
   - **Client fetches (photos):** call `withBusy` or `setBusy` around upload/remove.
   - **Sync OTA:** drop `staff-ota-sync-overlay` popup; rely on the shared veil via form pending.

Login page stays outside the busy shell (no veil required for login itself unless we later add it).

## Visual / a11y

- Fixed inset veil: soft ink wash (~20–30% opacity), centered spinner (maroon accent on border), short “Working…” label.
- `role="status"`, `aria-busy="true"`, `aria-live="polite"`.
- Pointer events blocked on the page while busy.
- Respect `prefers-reduced-motion`: no spin (or static ring).

Reuse tokens: `--color-ink`, `--color-maroon`, `--color-border`, `--color-surface`, existing spinner geometry from OTA sync (without the popup card).

## Out of scope

- Guest-facing booking UI
- Route `loading.tsx` skeletons (optional later; does not replace mutation veil)
- Changing server-action business logic

## Success criteria

- Saving a calendar stay, settings form, inbox decide, room assign, gallery upload, or Sync OTA shows the same soft veil until the action finishes.
- Instant toggles never flash the veil.
- No double-submit while the veil is up.
