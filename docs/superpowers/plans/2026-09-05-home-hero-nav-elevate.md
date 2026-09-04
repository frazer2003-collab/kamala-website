# Home Hero + Nav Elevate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the homepage first viewport to an immersive film-still hero with transparent→solid nav and a quiet dates instrument, without changing booking behavior.

**Architecture:** Keep existing React composition (`HomeHeroShell` → `GuestTopbar` home variant + `HomeDateSearchSection`). Change markup hierarchy and CSS in `guest-topbar-home.tsx`, `home-hero-intro.tsx`, `home-date-search-section.tsx`, `app/home-topbar.css`, and hero atmosphere rules in `app/globals.css` / `app/home-landing.css`.

**Tech Stack:** Next.js App Router, React, CSS in `app/*.css`, existing property settings + stay-date search.

## Global Constraints

- Scope: nav + hero only; no below-fold redesign
- Preserve stay-date / availability / SEO H1 wiring
- Brand tokens from DESIGN.md (maroon, Libre Baskerville, Plus Jakarta)
- No Maps in hero; chat links only in mobile menu
- DOM order: brand → H1 → lede → date search
- AA contrast; `prefers-reduced-motion` respected
- No fake urgency copy; no new APIs

---

### Task 1: Simplify home topbar markup

**Files:**
- Modify: `components/guest-topbar-home.tsx`
- Modify: `app/home-topbar.css`

- [x] Remove progress bar, nav indicator, overdrive class, scrollProgress CSS vars
- [x] Keep scrolled state for solid chrome; keep mobile menu + Escape
- [x] Desktop: Gallery, Location, Contact only
- [x] Mobile menu: those links + LINE/WhatsApp when configured
- [x] Transparent-over-hero styles when not scrolled; opaque when scrolled or menu open

### Task 2: Hero composition + Maps removal

**Files:**
- Modify: `components/home-hero-intro.tsx`
- Modify: `components/home-date-search-section.tsx`
- Modify: `app/globals.css` (hero-atmosphere) and/or `app/home-landing.css`

- [x] Brand = display-scale property name only (no Maps)
- [x] Order: intro (brand+H1) → lede → search
- [x] Soften search to instrument-not-card; calm label
- [x] Overlay + type hierarchy for film-still
- [x] Entrance motion with reduced-motion fallback

### Task 3: Verify

- [x] `npm run lint` on touched files if practical
- [x] Dev server visual check desktop + mobile if available
- [x] Confirm date search still submits as before
