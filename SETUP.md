# Kamala setup guide

Use this checklist when launching the booking site for a guesthouse or homestay.

## 1. Create services

1. **Supabase** — create a project and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)

2. **Stripe** — create an account (Thailand supported). Copy:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…` or `pk_live_…`)
   - `STRIPE_SECRET_KEY` (`sk_test_…` or `sk_live_…`)
   - `STRIPE_WEBHOOK_SECRET` (point webhook to `/api/stripe/webhook`)
   - Enable **THB** and **PromptPay** in Stripe Dashboard (Settings → Payment methods)
   - Webhook events: `payment_intent.succeeded`, `payment_intent.canceled`

### Switching Stripe accounts

Stay payments (full amount at booking) use only these three env vars (no account ID in code):

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Local: `.env.local` · Production: Vercel → Project → **Settings → Environment Variables** |
| `STRIPE_SECRET_KEY` | Same |
| `STRIPE_WEBHOOK_SECRET` | Same (create a **new** webhook on the new account for `https://your-domain.com/api/stripe/webhook`) |

After swapping keys: redeploy (or restart `npm run dev`), and confirm property currency in `/staff/settings` is **THB** so guests see card + PromptPay QR.

3. **Resend** — for booking and chat emails:
   - `RESEND_API_KEY`
   - `BOOKING_EMAIL_FROM` (verified domain)
   - `STAFF_NOTIFICATION_EMAIL` (fallback until staff settings are saved)

4. **Hosting** — deploy to Vercel (or similar) and set:
   - `NEXT_PUBLIC_APP_URL=https://www.kamalaguesthouse.com`
   - `STAFF_ADMIN_USERNAME` / `STAFF_ADMIN_PASSWORD` / `STAFF_SESSION_SECRET`

## 2. Run the database schema

In the Supabase SQL editor:

1. Run `supabase/schema.sql` once (complete current schema, room catalog, door numbers, RPCs, storage buckets)
2. Optionally run `supabase/seed-chiangmai-tours.sql` for starter tour cards

Historical one-off upgrade scripts live in `supabase/archive/` — only needed for very old databases. See `supabase/README.md`.

Staff enter every stay on the calendar: tap a day, choose **Book**, and pick the source (walk-in, Airbnb, Booking.com, or Expedia). iCal export URLs on room settings still feed outbound calendars to OTAs if you use them.

## 3. Configure the property

1. Sign in at `/staff/login`
2. Open **Settings** — set property name, address, currency (THB), policies, LINE/WhatsApp links, and the homepage background photo
3. Open **Rooms** — update rates, descriptions, and upload room photos
4. Open **Gallery** — upload guesthouse photos for the public `/gallery` page
5. Add staff notification emails in Settings

## 4. Test the booking flow

- [ ] Guest can book with **card** (full stay, Stripe test mode)
- [ ] Guest can book with **PromptPay QR** (full stay) when currency is THB
- [ ] Staff receives email and sees request on `/staff`
- [ ] Confirm / decline works; decline refunds payment
- [ ] Calendar shows confirmed stays
- [ ] Guest conversation link works after payment

## 5. Pre-launch checks

- [ ] Run `npm run build` locally or in CI before deploying
- [ ] `supabase/schema.sql` has been applied in Supabase
- [ ] Browser tab title shows your property name from Settings (not the default "Kamala")
- [ ] Room rates, photos, policies, and LINE/WhatsApp links are filled in under Settings and Rooms
- [ ] Stripe PromptPay enabled for the live account; webhook URL uses production domain

## 6. Go live

- Switch Stripe to **live** keys (see “Switching Stripe accounts” above)
- Verify `BOOKING_EMAIL_FROM` domain
- Set strong staff password
- Review legal pages: `/privacy`, `/terms`, `/cancellation`

## Optional

- **Inbound email replies** — configure Resend receiving + `/api/resend/inbound` (not required if guests use the private chat link only)
- **OneDrive / Windows dev** — use `npm run dev:webpack` if Turbopack file locks occur
