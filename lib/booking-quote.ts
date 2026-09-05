import { getTodayIso } from "@/lib/calendar";
import {
  discountCodeValidationMessage,
  getDiscountCodeByNormalizedCode,
  isDiscountCodeFormatValid,
  normalizeDiscountCodeInput,
  validateDiscountCodeForBooking,
  type DiscountCode,
} from "@/lib/discount-codes";
import {
  calculateStayQuoteWithOptionalCode,
  type RoomPromotionRate,
  type StayQuote,
} from "@/lib/pricing";
import { getRoomForBooking } from "@/lib/rooms";
import {
  buildRateLookup,
  getRoomDayRatesForRange,
} from "@/lib/room-day-rates";
import { getRoomPromotionsForStay } from "@/lib/room-promotions";

export type BookingQuoteResult = StayQuote & {
  baseNightlyRate: number;
  effectiveNightlyRate: number | null;
  promoLabel: string | null;
  discountCodeApplied: boolean;
  discountCodeError: string | null;
  discountCodeId: string | null;
  discountCodeText: string | null;
};

const emptyQuote: BookingQuoteResult = {
  nights: 0,
  total: 0,
  baseTotal: 0,
  promoNights: 0,
  hasPromotion: false,
  baseNightlyRate: 0,
  effectiveNightlyRate: null,
  promoLabel: null,
  discountCodeApplied: false,
  discountCodeError: null,
  discountCodeId: null,
  discountCodeText: null,
};

export async function getBookingQuote(
  roomId: string,
  arrival: string,
  departure: string,
  discountCodeInput?: string,
): Promise<BookingQuoteResult> {
  const room = await getRoomForBooking(roomId);
  if (!room) {
    return emptyQuote;
  }

  if (!arrival || !departure || departure <= arrival) {
    return {
      ...emptyQuote,
      baseNightlyRate: room.rate,
    };
  }

  return buildBookingQuote({
    roomId,
    baseRate: room.rate,
    arrival,
    departure,
    discountCodeInput,
  });
}

/**
 * Batch quotes for a stay when rooms are already loaded — one day-rate fetch
 * per room in parallel, optional shared promotions list to skip promo re-reads.
 */
export async function getBookingQuotesForRooms(
  rooms: Array<{ id: string; rate: number }>,
  arrival: string,
  departure: string,
  sharedPromotions?: RoomPromotionRate[],
): Promise<Record<string, BookingQuoteResult>> {
  if (!arrival || !departure || departure <= arrival || rooms.length === 0) {
    return Object.fromEntries(
      rooms.map((room) => [
        room.id,
        { ...emptyQuote, baseNightlyRate: room.rate },
      ]),
    );
  }

  const entries = await Promise.all(
    rooms.map(async (room) => {
      const quote = await buildBookingQuote({
        roomId: room.id,
        baseRate: room.rate,
        arrival,
        departure,
        sharedPromotions,
      });
      return [room.id, quote] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function buildBookingQuote({
  roomId,
  baseRate,
  arrival,
  departure,
  discountCodeInput,
  sharedPromotions,
}: {
  roomId: string;
  baseRate: number;
  arrival: string;
  departure: string;
  discountCodeInput?: string;
  sharedPromotions?: RoomPromotionRate[];
}): Promise<BookingQuoteResult> {
  const [promotions, dayRates] = await Promise.all([
    sharedPromotions
      ? Promise.resolve(sharedPromotions.filter((promotion) => promotion.roomId === roomId))
      : getRoomPromotionsForStay(roomId, arrival, departure),
    getRoomDayRatesForRange(roomId, arrival, departure),
  ]);
  const stayPromotions = promotions;
  const rateOverrides = buildRateLookup(dayRates);
  const todayIso = getTodayIso();

  let codePercentOff: number | null = null;
  let discountCodeError: string | null = null;
  let discountCodeId: string | null = null;
  let discountCodeText: string | null = null;
  let matchedCode: DiscountCode | null = null;

  const normalizedInput = discountCodeInput
    ? normalizeDiscountCodeInput(discountCodeInput)
    : "";

  if (normalizedInput) {
    if (!isDiscountCodeFormatValid(normalizedInput)) {
      discountCodeError = discountCodeValidationMessage("not_found");
    } else {
      const code = await getDiscountCodeByNormalizedCode(normalizedInput);
      if (!code) {
        discountCodeError = discountCodeValidationMessage("not_found");
      } else {
        const validation = validateDiscountCodeForBooking(code, roomId, todayIso);
        if (!validation.ok) {
          discountCodeError = discountCodeValidationMessage(validation.reason);
        } else {
          matchedCode = validation.code;
          codePercentOff = validation.code.percentOff;
          discountCodeId = validation.code.id;
          discountCodeText = validation.code.code;
        }
      }
    }
  }

  const quote = calculateStayQuoteWithOptionalCode({
    roomId,
    baseRate,
    arrival,
    departure,
    promotions: stayPromotions,
    rateOverrides,
    codePercentOff,
  });

  let promoLabel: string | null = null;
  if (quote.codeApplied && matchedCode) {
    promoLabel = matchedCode.label ?? `${matchedCode.percentOff}% off · ${matchedCode.code}`;
  } else if (quote.hasPromotion) {
    promoLabel =
      stayPromotions.find((promotion) => promotion.label)?.label ??
      `${Math.round(((quote.baseTotal - quote.total) / quote.baseTotal) * 100)}% off`;
  }

  return {
    ...quote,
    baseNightlyRate: baseRate,
    effectiveNightlyRate:
      quote.nights > 0 ? Math.round(quote.total / quote.nights) : null,
    promoLabel,
    discountCodeApplied: quote.codeApplied,
    discountCodeError,
    discountCodeId,
    discountCodeText,
  };
}

export async function quoteRoomStay(
  roomId: string,
  baseRate: number,
  arrival: string,
  departure: string,
  discountCodeInput?: string,
) {
  const quote = await buildBookingQuote({
    roomId,
    baseRate,
    arrival,
    departure,
    discountCodeInput,
  });

  return {
    nights: quote.nights,
    total: quote.total,
    baseTotal: quote.baseTotal,
    promoNights: quote.promoNights,
    hasPromotion: quote.hasPromotion,
    discountCodeId: quote.discountCodeId,
    discountCodeText: quote.discountCodeText,
    discountCodeError: quote.discountCodeError,
  };
}
