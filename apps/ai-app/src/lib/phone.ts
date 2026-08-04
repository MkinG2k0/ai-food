/** Normalize RU mobile to 7XXXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let n = digits;
  if (n.length === 11 && n.startsWith('8')) n = `7${n.slice(1)}`;
  if (n.length === 10) n = `7${n}`;
  if (n.length !== 11 || !n.startsWith('7')) return null;
  return n;
}
