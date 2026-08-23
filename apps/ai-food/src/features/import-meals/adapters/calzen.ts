import { parseSpacedNumber } from '../lib/parseSpacedNumber';
import type { ImportedMealDraft } from '../model/types';
import type { MealImportAdapter } from './types';

const MONTHS: Record<string, string> = {
  'СЏРЅРІ': '01',
  'С„РµРІ': '02',
  'РјР°СЂ': '03',
  'Р°РїСЂ': '04',
  'РјР°Р№': '05',
  'РёСЋРЅ': '06',
  'РёСЋР»': '07',
  'Р°РІРі': '08',
  'СЃРµРЅ': '09',
  'РѕРєС‚': '10',
  'РЅРѕСЏ': '11',
  'РґРµРє': '12',
};
const MONTHS_BY_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(MONTHS).map(([key, value]) => [key.toLowerCase(), value]),
);
const DAY_HEADER =
  /^(Р’СЃ|РџРЅ|Р’С‚|РЎСЂ|Р§С‚|РџС‚|РЎР±)\s+(\d{1,2})\s+(СЏРЅРІ|С„РµРІ|РјР°СЂ|Р°РїСЂ|РјР°Р№|РёСЋРЅ|РёСЋР»|Р°РІРі|СЃРµРЅ|РѕРєС‚|РЅРѕСЏ|РґРµРє)/i;
const MEAL_START = /^(\d{1,2}):(\d{2})\s+(.+)$/;
const MACROS =
  /Р‘\s*([\d\s]+)\s*В·\s*Р–\s*([\d\s]+)\s*В·\s*РЈ\s*([\d\s]+)\s*В·\s*РљР»\s*([\d\s]+)\s*Рі\s+([\d\s]+)\s*РєРєР°Р»/i;

function detect(text: string): boolean {
  return (
    /calzen/i.test(text) &&
    (/Р”РќР•Р’РќРРљ\s+РџРРўРђРќРРЇ/i.test(text) ||
      /РѕС‚С‡С‘С‚\s+Рѕ\s+РїРёС‚Р°РЅРёРё/i.test(text))
  );
}

export function parseCalzenReport(text: string): ImportedMealDraft[] {
  const year = text.match(/(20\d{2})\s*Рі/)?.[1];
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
