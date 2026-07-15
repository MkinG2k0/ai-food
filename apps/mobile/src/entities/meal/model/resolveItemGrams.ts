/** Resolve display grams from new FoodItem.grams or legacy portion strings. */
export function resolveItemGrams(item: {
  grams?: number;
  portion?: string;
}): number {
  if (typeof item.grams === 'number' && Number.isFinite(item.grams)) {
    return Math.max(0, Math.round(item.grams));
  }

  if (typeof item.portion === 'string') {
    const match = item.portion.trim().match(/^(\d+(?:\.\d+)?)/);
    if (match) {
      return Math.max(0, Math.round(Number(match[1])));
    }
  }

  return 100;
}
