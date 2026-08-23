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
const MEAL_START = /^(\d{1,2}):(\d{2})\s+(.+)$/;
const MACROS =
  /Б\s*([\d\s]+)\s*·\s*Ж\s*([\d\s]+)\s*·\s*У\s*([\d\s]+)\s*·\s*Кл\s*([\d\s]+)\s*г\s+([\d\s]+)\s*ккал/i;

function detect(text: string): boolean {
  return (
    /calzen/i.test(text) &&
    (/ДНЕВНИК\s+ПИТАНИЯ/i.test(text) || /отчёт\s+о\s+питании/i.test(text))
  );
}

export function parseCalzenReport(text: string): ImportedMealDraft[] {
  const year = text.match(/(20\d{2})\s*г/)?.[1];
  if (!year) return [];

  const meals: ImportedMealDraft[] = [];
  let currentDate: string | null = null;
  let pendingName: { time: string; name: string } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\f/g, '').trim();
    if (!line || /^-- page break --$/i.test(line)) continue;

    const day = line.match(DAY_HEADER);
    if (day) {
      const month = MONTHS_BY_LOWER[day[3].toLowerCase()];
      currentDate = month ? `${year}-${month}-${day[2].padStart(2, '0')}` : null;
      pendingName = null;
      continue;
    }

    const meal = line.match(MEAL_START);
    if (meal) {
      pendingName = {
        time: `${meal[1].padStart(2, '0')}:${meal[2]}`,
        name: meal[3],
      };
      continue;
    }

    const macros = line.match(MACROS);
    if (macros && pendingName && currentDate) {
      meals.push({
        date: currentDate,
        time: pendingName.time,
        name: pendingName.name,
        calories: parseSpacedNumber(macros[5]),
        protein: parseSpacedNumber(macros[1]),
        fat: parseSpacedNumber(macros[2]),
        carbs: parseSpacedNumber(macros[3]),
        fiber: parseSpacedNumber(macros[4]),
      });
      pendingName = null;
    }
  }

  return meals;
}

export const calzenAdapter: MealImportAdapter = {
  id: 'calzen',
  detect,
  parse: parseCalzenReport,
};
