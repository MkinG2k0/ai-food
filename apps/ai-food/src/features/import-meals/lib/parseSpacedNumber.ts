/** Parse numbers that may use spaces as thousand separators (`1 981`). */
export function parseSpacedNumber(raw: string): number {
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return Number.NaN;
  return Number(cleaned);
}
