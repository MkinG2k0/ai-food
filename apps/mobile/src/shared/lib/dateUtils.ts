const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(weekOffset: number): Date[] {
  const baseMonday = getWeekStart(new Date());
  const offsetMs = weekOffset * 7 * 24 * 60 * 60 * 1000;
  const monday = new Date(baseMonday.getTime() + offsetMs);
  return Array.from({ length: 7 }, (_, i) => {
    return new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function formatDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

export function formatHeaderDate(date: Date): string {
  if (isSameDay(date, new Date())) return 'Сегодня';
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
