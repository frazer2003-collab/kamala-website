# Calendar backend hardening

Date: 2026-07-20

## Decisions (from operator)

1. **Airbnb is source of truth for dates / door / type** from the feed. Staff-entered guest name, phone, email, and staff notes must survive sync.
2. **Overbooks are allowed** (like normal stays). Calendar must show them as overbooked / needs attention.
3. Fix all critique issues: fail-closed query errors, pending hold, durable sync, SSRF allowlist, export privacy.

## Tasks

1. Capacity: fail closed on query errors; reserve on pending_payment / bank claim; staff may overbook; surface overbook metrics.
2. iCal sync: preserve staff fields by UID; Airbnb owns dates/room/unit; check restore; host allowlist.
3. Calendar UI: overbooked day/stay badges needing attention.
4. Export: opaque “Reserved”; private cache headers.
