# Home Middle Elevate Implementation Plan

> **For agentic workers:** Implement task-by-task. Mobile-first is binding.

**Goal:** Elevate assurances, rooms/book zone, and stay story to match the hero continuum, optimized for mobile.

**Architecture:** CSS-first refine of existing components; preserve booking/availability behavior.

**Tech Stack:** Next.js, existing CSS modules in `app/*.css`

## Global Constraints

- Approach A quiet counter continuum
- Mobile ≤640: 1-col, ≥44px targets, no overflow
- No invented copy; no booking API changes
- No opacity-gated scroll reveals

---

### Task 1: Assurances phrase rail
- Rewrite `app/home-landing.css` assurances block

### Task 2: Book zone + listings quiet chrome
- Soften `home-direct-booking.css` + `home-overdrive.css` listing/book-zone
- Mobile CTA stacking polish in globals if needed

### Task 3: Stay story editorial
- Unbox aside; mobile stack; remove scroll opacity gates

### Task 4: Verify on ~390px and ~1280px
