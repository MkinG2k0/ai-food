export function formatCalories(kcal: number): string {
  return `${Math.round(kcal)} ккал`;
}

export function formatMacro(grams: number): string {
  return `${Math.round(grams)} г`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
