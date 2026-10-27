export type FinanceSoldPieModel = {
  capacity: number;
  nightsSold: number;
  nightsUnsold: number;
  nightsOverCapacity: number;
  fillShare: number;
  openShare: number;
  passedShare: number;
  soldPercent: number | null;
  unsoldPercent: number | null;
  isOverCapacity: boolean;
  /** Empty door-nights that can still be booked. */
  nightsStillOpen: number;
  /** Empty door-nights before today. */
  nightsPassedUnsold: number;
};

export function buildFinanceSoldPieModel(
  nightsSold: number,
  nightsAvailable: number,
  nightsOverCapacity = 0,
  nightsStillOpen?: number,
  nightsPassedUnsold = 0,
): FinanceSoldPieModel {
  const capacity = Math.max(0, nightsAvailable);
  const sold = Math.max(0, nightsSold);
  const over = Math.max(0, nightsOverCapacity, sold - capacity);
  const filled = capacity > 0 ? Math.min(sold, capacity) : 0;
  const unsold = Math.max(0, capacity - filled);
  let still = nightsStillOpen === undefined ? unsold : Math.max(0, nightsStillOpen);
  let passed = nightsStillOpen === undefined ? 0 : Math.max(0, nightsPassedUnsold);
  if (capacity > 0 && still + passed > capacity) {
    const scale = capacity / (still + passed);
    still = Math.floor(still * scale);
    passed = capacity - still;
  }
  const soldDoors = capacity > 0 ? Math.max(0, capacity - still - passed) : 0;
  const soldPercent =
    capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : null;
  const unsoldPercent =
    capacity > 0 ? Math.max(0, 100 - (soldPercent ?? 0)) : null;
  const fillShare = capacity > 0 ? (soldDoors / capacity) * 100 : 0;
  const openShare = capacity > 0 ? (still / capacity) * 100 : 0;
  const passedShare = capacity > 0 ? (passed / capacity) * 100 : 0;

  return {
    capacity,
    nightsSold: sold,
    nightsUnsold: unsold,
    nightsOverCapacity: over,
    fillShare,
    openShare,
    passedShare,
    soldPercent,
    unsoldPercent,
    isOverCapacity: over > 0,
    nightsStillOpen: still,
    nightsPassedUnsold: passed,
  };
}

export function buildFinanceSoldPieAriaLabel(model: FinanceSoldPieModel) {
  if (model.capacity <= 0) {
    return "No door-nights available in this range";
  }

  const base = `Sold ${model.nightsSold} of ${model.capacity} door-nights${
    model.soldPercent === null ? "" : ` (${model.soldPercent}%)`
  }. ${model.nightsStillOpen} still open${
    model.nightsPassedUnsold > 0
      ? `, ${model.nightsPassedUnsold} unsold nights already passed`
      : ""
  }`;

  if (!model.isOverCapacity) {
    return base;
  }

  return `${base}; ${model.nightsOverCapacity} night${
    model.nightsOverCapacity === 1 ? "" : "s"
  } over capacity`;
}

export function buildFinanceSoldPieGradient(
  model: FinanceSoldPieModel,
  soldColor: string,
  unsoldColor: string,
  passedColor = "var(--color-border)",
) {
  if (model.capacity <= 0) {
    return "var(--color-surface-strong)";
  }
  if (model.nightsStillOpen <= 0 && model.nightsPassedUnsold <= 0) {
    return soldColor;
  }
  if (model.fillShare <= 0 && model.passedShare <= 0) {
    return unsoldColor;
  }
  if (model.passedShare <= 0) {
    return `conic-gradient(from -90deg, ${soldColor} 0% ${model.fillShare}%, ${unsoldColor} ${model.fillShare}% 100%)`;
  }
  const openEnd = model.fillShare + model.openShare;
  return `conic-gradient(from -90deg, ${soldColor} 0% ${model.fillShare}%, ${unsoldColor} ${model.fillShare}% ${openEnd}%, ${passedColor} ${openEnd}% 100%)`;
}
