export type RoomPromotionRate = {
  roomId: string;
  startDate: string;
  endDate: string;
  /** Whole-number percent off the standard nightly rate (1–90). */
  percentOff: number;
  label?: string | null;
};

export type StayQuote = {
  nights: number;
  total: number;
  baseTotal: number;
  promoNights: number;
  hasPromotion: boolean;
};

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eachStayNight(arrival: string, departure: string) {
  const nights: string[] = [];
  const cursor = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || end <= cursor) {
    return nights;
  }

  while (cursor < end) {
    nights.push(formatIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return nights;
}

export function applyPercentOff(baseRate: number, percentOff: number) {
  const clamped = Math.min(90, Math.max(0, percentOff));
  return Math.max(0, Math.round(baseRate * (1 - clamped / 100)));
}

/** True when a night falls inside a promotion (start and end dates are both inclusive). */
export function promotionCoversNight(promotion: RoomPromotionRate, night: string) {
  return night >= promotion.startDate && night <= promotion.endDate;
}

export function getBestPercentOffForNight(
  roomId: string,
  night: string,
  promotions: RoomPromotionRate[],
) {
  const matching = promotions.filter(
    (promotion) => promotion.roomId === roomId && promotionCoversNight(promotion, night),
  );

  if (matching.length === 0) {
    return 0;
  }

  return Math.max(...matching.map((promotion) => promotion.percentOff));
}

export function getPromoRateForNight(
  roomId: string,
  night: string,
  baseRate: number,
  promotions: RoomPromotionRate[],
  rateOverrides?: Map<string, number>,
) {
  const override = rateOverrides?.get(`${roomId}:${night}`);
  if (override !== undefined) {
    return override;
  }

  const percentOff = getBestPercentOffForNight(roomId, night, promotions);
  if (percentOff <= 0) {
    return baseRate;
  }

  return applyPercentOff(baseRate, percentOff);
}

/** Temp day rate wins over room default and promo %. */
export function getNightlyRateDetails(
  roomId: string,
  night: string,
  baseRate: number,
  promotions: RoomPromotionRate[],
  rateOverrides?: Map<string, number>,
) {
  const override = rateOverrides?.get(`${roomId}:${night}`);
  if (override !== undefined) {
    return {
      rate: override,
      percentOff: 0,
      hasRateOverride: true,
    };
  }

  const percentOff = getBestPercentOffForNight(roomId, night, promotions);
  return {
    rate: percentOff > 0 ? applyPercentOff(baseRate, percentOff) : baseRate,
    percentOff,
    hasRateOverride: false,
  };
}

/** Best active discount for a room on a given night (or today). */
export function getActivePromotionForRoom(
  roomId: string,
  promotions: RoomPromotionRate[],
  night: string,
) {
  const matching = promotions.filter(
    (promotion) => promotion.roomId === roomId && promotionCoversNight(promotion, night),
  );

  if (matching.length === 0) {
    return null;
  }

  return matching.reduce((best, promotion) =>
    promotion.percentOff > best.percentOff ? promotion : best,
  );
}

export function calculateStayQuote({
  roomId,
  baseRate,
  arrival,
  departure,
  promotions,
  rateOverrides,
}: {
  roomId: string;
  baseRate: number;
  arrival: string;
  departure: string;
  promotions: RoomPromotionRate[];
  rateOverrides?: Map<string, number>;
}): StayQuote {
  const stayNights = eachStayNight(arrival, departure);

  if (stayNights.length === 0) {
    return {
      nights: 0,
      total: 0,
      baseTotal: 0,
      promoNights: 0,
      hasPromotion: false,
    };
  }

  let total = 0;
  let baseTotal = 0;
  let promoNights = 0;

  for (const night of stayNights) {
    const details = getNightlyRateDetails(
      roomId,
      night,
      baseRate,
      promotions,
      rateOverrides,
    );
    baseTotal += baseRate;
    total += details.rate;
    if (!details.hasRateOverride && details.rate < baseRate) {
      promoNights += 1;
    }
  }

  return {
    nights: stayNights.length,
    total,
    baseTotal,
    promoNights,
    hasPromotion: promoNights > 0,
  };
}
