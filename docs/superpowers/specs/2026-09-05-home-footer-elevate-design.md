# Home footer elevate (Approach A — Quiet counter continuum)

**Date:** 2026-09-05  
**Status:** Approved (continuation of homepage elevate)  
**Scope:** `SiteFooter` + `FooterSocials` on guest homepage (and shared guest footer styles)  
**Out of scope:** Hero, middle sections (already elevated), staff chrome, invented copy

## Goal

Close the page in the same Trusted Counter language: calm place identity, reachable contacts, quiet page links — mobile-first.

## Design

1. **Place block** — Property name in display serif (smaller than hero); tagline/address as muted body. No card wrap.
2. **Reach us** — Contact links as a clean list/rail with icons; ≥44px targets on mobile; stack full-width on ≤640px.
3. **Follow** — Compact icon row; no “Follow” eyebrow theater if it crowds mobile — keep a quiet label.
4. **Nav** — Gallery · Rooms · Location · Contact · Cancellation; Staff stays de-emphasized.
5. **Surface** — Canvas continuum, hairline top border only; no maroon wash panel, no heavy shadow.
6. **Mobile** — Single column: contacts → place → nav (or contacts → nav → place); wrap nav links with generous tap gaps; no horizontal overflow.

## Preserve

- Settings-driven URLs/phone/email only
- External link `rel` / `target` behavior
- Existing contact channel set

## Files

- `components/site-footer.tsx` (structure/classes if needed)
- `app/footer-socials.css`
- `app/globals.css` (`.site-footer` / `.guest-site .site-footer`)
- Optionally `app/home-overdrive.css` homepage footer tweaks
