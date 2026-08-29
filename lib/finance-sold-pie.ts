export type FinanceSoldPieModel = {
  capacity: number;
  nightsSold: number;
  nightsUnsold: number;
  nightsOverCapacity: number;
  fillShare: number;
  soldPercent: number | null;
  unsoldPercent: number | null;
  isOverCapacity: boolean;
};

export function buildFinanceSoldPieModel(
  nightsSold: number,
  nightsAvailable: number,
  nightsOverCapacity = 0,
): FinanceSoldPieModel {
  const capacity = Math.max(0, nightsAvailable);
  const sold = Math.max(0, nightsSold);
  const over = Math.max(0, nightsOverCapacity, sold - capacity);
  const filled = capacity > 0 ? Math.min(sold, capacity) : 0;
  const unsold = Math.max(0, capacity - filled);
  const soldPercent =
    capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : null;
  const unsoldPercent =
    capacity > 0 ? Math.max(0, 100 - (soldPercent ?? 0)) : null;
  const fillShare = capacity > 0 ? (filled / capacity) * 100 : 0;

  return {
    capacity,
    nightsSold: sold,
    nightsUnsold: unsold,
    nightsOverCapacity: over,
    fillShare,
    soldPercent,
    unsoldPercent,
    isOverCapacity: over > 0,
  };
}

export function buildFinanceSoldPieAriaLabel(model: FinanceSoldPieModel) {
  if (model.capacity <= 0) {
    return "No door-nights available in this range";
  }

  const base = `Sold ${model.nightsSold} of ${model.capacity} door-nights${
    model.soldPercent === null ? "" : ` (${model.soldPercent}%)`
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
) {
  if (model.capacity <= 0) {
    return "var(--color-surface-strong)";
  }
  if (model.nightsSold <= 0) {
    return unsoldColor;
  }
  if (model.nightsUnsold <= 0) {
    return soldColor;
  }
  return `conic-gradient(from -90deg, ${soldColor} 0% ${model.fillShare}%, ${unsoldColor} ${model.fillShare}% 100%)`;
}
