# Staff Busy Veil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a soft full-page veil + spinner (“Working…”) whenever staff run a non-instant mutation.

**Architecture:** Client `StaffBusyProvider` (refcount) mounts once in a shared `StaffShell`. Forms report pending via a tiny `useFormStatus` bridge; photo uploads call `withBusy`. Sync OTA drops its popup and uses the same veil.

**Tech Stack:** Next.js App Router, React 19 (`useFormStatus` / `useActionState`), existing staff CSS tokens.

**Spec:** `docs/superpowers/specs/2026-07-20-staff-busy-veil-design.md`

## Global Constraints

- Soft veil only (no card/popup); copy “Working…”
- All logged-in staff pages; login excluded
- Instant UI (open panel, expand Availability) must not trigger veil
- Soft veil also while navigating between staff pages / calendar query changes
- Respect `prefers-reduced-motion`

---

### Task 1: Busy provider + overlay CSS

**Files:**
- Create: `components/staff-busy.tsx`
- Create: `components/staff-shell.tsx`
- Modify: `app/globals.css` (replace/generalize `.staff-ota-sync-overlay`)

- [ ] Provider with refcount `startBusy` / `endBusy` / `withBusy`
- [ ] Overlay: soft ink wash, spinner, “Working…”, a11y attrs
- [ ] `StaffFormBusyBridge` using `useFormStatus`
- [ ] `StaffShell` wraps sidebar + children + provider + overlay
- [ ] CSS `.staff-busy-overlay` / `__spinner` (reuse OTA spinner geometry; delete popup styles or alias)

### Task 2: Wire staff pages into StaffShell

**Files:** Modify all logged-in `app/staff/**/page.tsx` except `login`

- [ ] Replace repeated `<main className="staff-shell">` + sidebar with `<StaffShell current="…">`

### Task 3: Cover forms + uploads; simplify Sync OTA

**Files:** Staff/calendar form components; photo managers; `staff-ota-sync-controls.tsx`

- [ ] Add `<StaffFormBusyBridge />` (or switch to `StaffForm`) on every staff mutation form
- [ ] Wrap photo `fetch` uploads with `withBusy`
- [ ] Sync OTA: button pending only; remove popup markup

### Task 4: Verify

- [ ] `npx tsc --noEmit`
- [ ] `npm test`
- [ ] Smoke: calendar save, settings save, Sync OTA show same veil
