import { canCleanupPendingBooking } from "@/lib/booking-payment-race";
import { releaseDiscountCodeUse } from "@/lib/discount-codes";
import { hasStripeServerConfig, getStripe } from "@/lib/stripe";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
} from "@/lib/supabase";

/** Unfinished Thai bank / QR (or card) checkout — auto-cleared after this age. */
export const ABANDONED_CHECKOUT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function abandonedCheckoutCutoffIso(now: Date = new Date()) {
  return new Date(now.getTime() - ABANDONED_CHECKOUT_MAX_AGE_MS).toISOString();
}

/**
 * True when a Requests hold is an abandoned cart: still pending payment,
 * never claimed I've paid / never paid, and older than 24 hours.
 */
export function isExpiredAbandonedCheckout({
  status,
  bankTransferClaimedAt,
  depositPaidAt,
  createdAt,
  now = new Date(),
}: {
  status: string;
  bankTransferClaimedAt: string | null;
  depositPaidAt: string | null;
  createdAt: string;
  now?: Date;
}) {
  if (depositPaidAt) {
    return false;
  }
  if (
    !canCleanupPendingBooking({
      status,
      bankTransferClaimedAt,
    })
  ) {
    return false;
  }
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) {
    return false;
  }
  return createdMs <= now.getTime() - ABANDONED_CHECKOUT_MAX_AGE_MS;
}

async function cancelPaymentIntentBestEffort(paymentIntentId: string) {
  if (!hasStripeServerConfig()) {
    return;
  }
  try {
    await getStripe().paymentIntents.cancel(paymentIntentId);
  } catch {
    // Intent may already be canceled or completed.
  }
}

/**
 * Delete unfinished checkouts older than 24 hours (abandoned QR / bank carts
 * and leftover card pages). Idempotent — safe on every Requests load + cron.
 * Does not touch I've-paid claims waiting for staff.
 */
export async function purgeAbandonedCheckouts(now: Date = new Date()) {
  if (!hasStaffSupabaseConfig()) {
    return { deleted: 0, error: null as string | null };
  }

  const cutoff = abandonedCheckoutCutoffIso(now);

  try {
    const supabase = createStaffSupabaseClient();
    const { data: rows, error } = await supabase
      .from("booking_requests")
      .select("id, stripe_payment_intent_id, discount_code_id")
      .eq("status", "pending_payment")
      .is("bank_transfer_claimed_at", null)
      .is("deposit_paid_at", null)
      .lt("created_at", cutoff)
      .limit(100);

    if (error) {
      return { deleted: 0, error: error.message };
    }

    let deleted = 0;
    for (const row of rows ?? []) {
      if (row.stripe_payment_intent_id) {
        await cancelPaymentIntentBestEffort(row.stripe_payment_intent_id);
      }
      if (row.discount_code_id) {
        await releaseDiscountCodeUse(row.discount_code_id);
      }

      const { data: removed } = await supabase
        .from("booking_requests")
        .delete()
        .eq("id", row.id)
        .eq("status", "pending_payment")
        .is("bank_transfer_claimed_at", null)
        .is("deposit_paid_at", null)
        .select("id")
        .maybeSingle();

      if (removed) {
        deleted += 1;
      }
    }

    return { deleted, error: null as string | null };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : "purge-failed",
    };
  }
}
