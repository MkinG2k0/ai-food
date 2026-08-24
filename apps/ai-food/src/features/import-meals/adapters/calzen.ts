import { parseSpacedNumber } from '../lib/parseSpacedNumber';
import type { ImportedMealDraft } from '../model/types';
import type { MealImportAdapter } from './types';

const MONTHS: Record<string, string> = {
  янв: '01',
  фев: '02',
  мар: '03',
  апр: '04',
  май: '05',
  июн: '06',
  июл: '07',
  авг: '08',
  сен: '09',
  окт: '10',
  ноя: '11',
  дек: '12',
};
const MONTHS_BY_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(MONTHS).map(([key, value]) => [key.toLowerCase(), value]),
);
const DAY_HEADER =
  /^(Вс|Пн|Вт|Ср|Чт|Пт|Сб)\s+(\d{1,2})\s+(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)/i;
const MEAL_INLINE = /^(\d{1,2}):(\d{2})\s+(.+)$/;
const TIME_ONLY = /^(\d{1,2}):(\d{2})$/;
const TIME_WITH_CALORIES = /^(\d{1,2}):(\d{2})\s+([\d\s]+)\s*ккал\s*$/i;
const CALORIES_ONLY = /^([\d\s]+)\s*ккал\s*$/i;
const MACROS_WITH_KCAL =
  /Б\s*([\d\s]+)\s*·\s*Ж\s*([\d\s]+)\s*·\s*У\s*([\d\s]+)\s*·\s*Кл\s*([\d\s]+)\s*г\s+([\d\s]+)\s*ккал/i;
const MACROS_ONLY =
  /^Б\s*([\d\s]+)\s*·\s*Ж\s*([\d\s]+)\s*·\s*У\s*([\d\s]+)\s*·\s*Кл\s*([\d\s]+)\s*г\s*$/i;

type PendingMeal = {
  time: string;
  name: string;
  calories?: number;
};

function detect(text: string): boolean {
  return (
    /calzen/i.test(text) &&
    (/ДНЕВНИК\s+ПИТАНИЯ/i.test(text) || /отчёт\s+о\s+питании/i.test(text))
  );
}

function isSkippableLine(line: string): boolean {
  return (
    !line ||
    /^-- page break --$/i.test(line) ||
    /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) ||
    /^CalZen$/i.test(line) ||
    /calzen\.ai/i.test(line) ||
    /^отчёт о питании/i.test(line) ||
    /млн\+\s*пользователей/i.test(line) ||
    /^(iOS|Android)$/i.test(line) ||
    /^Нет записей$/i.test(line)
  );
}

function parseDayDate(line: string, year: string): string | null {
  const day = line.match(DAY_HEADER);
  if (!day) return null;

  const month = MONTHS_BY_LOWER[day[3].toLowerCase()];
  return month ? `${year}-${month}-${day[2].padStart(2, '0')}` : null;
}

function pushMeal(
  meals: ImportedMealDraft[],
  currentDate: string,
  pending: PendingMeal,
  protein: number,
  fat: number,
  carbs: number,
  fiber: number,
  calories: number,
): void {
  meals.push({
    date: currentDate,
    time: pending.time,
    name: pending.name,
    calories,
    protein,
    fat,
    carbs,
    fiber,
  });
}

export function parseCalzenReport(text: string): ImportedMealDraft[] {
  const year = text.match(/(20\d{2})\s*г/)?.[1];
  if (!year) return [];

  const meals: ImportedMealDraft[] = [];
  let currentDate: string | null = null;
  let pending: PendingMeal | null = null;
  let pendingName: string | null = null;

  const resetPending = () => {
    pending = null;
    pendingName = null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\f/g, '').trim();
    if (isSkippableLine(line)) continue;

    const dayDate = parseDayDate(line, year);
    if (dayDate) {
      currentDate = dayDate;
      resetPending();
      continue;
    }

    if (!currentDate) continue;

    const timeWithCalories = line.match(TIME_WITH_CALORIES);
    if (timeWithCalories) {
      const time = `${timeWithCalories[1].padStart(2, '0')}:${timeWithCalories[2]}`;
      const calories = parseSpacedNumber(timeWithCalories[3]);
      let name = '';
      if (pendingName) {
        name = pendingName;
        pendingName = null;
      } else if (pending !== null) {
        name = pending.name;
      }
      pending = { time, name, calories };
      continue;
    }

    const inlineMeal = line.match(MEAL_INLINE);
    if (inlineMeal) {
      pending = {
        time: `${inlineMeal[1].padStart(2, '0')}:${inlineMeal[2]}`,
        name: inlineMeal[3].trim(),
      };
      pendingName = null;
      continue;
    }

    const timeOnly = line.match(TIME_ONLY);
    if (timeOnly) {
      const time = `${timeOnly[1].padStart(2, '0')}:${timeOnly[2]}`;
      if (pendingName) {
        pending = { time, name: pendingName };
        pendingName = null;
      } else {
        pending = { time, name: '' };
      }
      continue;
    }

    const macrosWithKcal = line.match(MACROS_WITH_KCAL);
    if (macrosWithKcal && pending?.name) {
      pushMeal(
        meals,
        currentDate,
        pending,
        parseSpacedNumber(macrosWithKcal[1]),
        parseSpacedNumber(macrosWithKcal[2]),
        parseSpacedNumber(macrosWithKcal[3]),
        parseSpacedNumber(macrosWithKcal[4]),
        parseSpacedNumber(macrosWithKcal[5]),
      );
      resetPending();
      continue;
    }

    const caloriesOnly = line.match(CALORIES_ONLY);
    if (caloriesOnly && pending?.name && pending.time) {
      pending = {
        ...pending,
        calories: parseSpacedNumber(caloriesOnly[1]),
      };
      continue;
    }

    const macrosOnly = line.match(MACROS_ONLY);
    if (macrosOnly && pending?.name && pending.time && pending.calories != null) {
      pushMeal(
        meals,
        currentDate,
        pending,
        parseSpacedNumber(macrosOnly[1]),
        parseSpacedNumber(macrosOnly[2]),
        parseSpacedNumber(macrosOnly[3]),
        parseSpacedNumber(macrosOnly[4]),
        pending.calories,
      );
      resetPending();
      continue;
    }

    if (pending?.time && !pending.name) {
      pending = { ...pending, name: line };
      pendingName = null;
      continue;
    }

    if (!pending) {
      pendingName = line;
    }
  }

  return meals;
}

export const calzenAdapter: MealImportAdapter = {
  id: 'calzen',
  detect,
  parse: parseCalzenReport,
};
