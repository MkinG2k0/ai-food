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

/** Calendar day after today (local timezone). */
export function isFutureDay(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
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

export interface MonthGridDay {
  date: Date;
  /** True when date is in the requested calendar month. */
  inMonth: boolean;
}

/**
 * Mon–Sun month grid with leading/trailing padding days from adjacent months.
 * `month` is 0-based (Date.getMonth()).
 */
export function getMonthGridDays(year: number, month: number): MonthGridDay[] {
  const first = new Date(year, month, 1);
  first.setHours(0, 0, 0, 0);
  const gridStart = getWeekStart(first);
  const last = new Date(year, month + 1, 0);
  last.setHours(0, 0, 0, 0);
  const lastWeekStart = getWeekStart(last);
  const gridEnd = new Date(lastWeekStart);
  gridEnd.setDate(gridEnd.getDate() + 6);

  const days: MonthGridDay[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    const d = new Date(cursor);
    days.push({
      date: d,
      inMonth: d.getMonth() === month && d.getFullYear() === year,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Week offset of `date` relative to the week containing `today` (Mon-start). */
export function weekOffsetForDate(date: Date, today: Date = new Date()): number {
  const selectedMonday = getWeekStart(date).getTime();
  const thisMonday = getWeekStart(today).getTime();
  return Math.round(
    (selectedMonday - thisMonday) / (7 * 24 * 60 * 60 * 1000),
  );
}

/** Calendar Y/M/D from selectedDate, clock time from now → ISO string. */
export function timestampForSelectedDate(selectedDate: Date, now: Date = new Date()): string {
  const result = new Date(now);
  result.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  );
  return result.toISOString();
}
