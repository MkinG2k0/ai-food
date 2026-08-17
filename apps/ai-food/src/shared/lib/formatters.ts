export function formatCalories(kcal: number): string {
  return `${Math.round(kcal)} ккал`;
}

function formatTenths(value: number): string {
  const n = Number.isFinite(value) ? Math.max(0, Math.round(value * 10) / 10) : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatMacro(grams: number): string {
  return `${formatTenths(grams)} г`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
