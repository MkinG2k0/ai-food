import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calzenAdapter } from './calzen';

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'fixtures/calzen-diary-sample.txt'),
  'utf8',
);

describe('calzenAdapter.detect', () => {
  it('detects CalZen report text', () => {
    expect(calzenAdapter.detect(fixture)).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(calzenAdapter.detect('MyFitnessPal export CSV')).toBe(false);
  });
});

describe('calzenAdapter.parse', () => {
  it('parses meals with macros, year, and truncated names', () => {
    const meals = calzenAdapter.parse(fixture);
    expect(meals).toHaveLength(7);
    expect(meals[0]).toEqual({
      date: '2026-07-28',
      time: '01:33',
      name: 'йогурт с шоколадным печеньем',
      calories: 254,
      protein: 6,
      fat: 10,
      carbs: 34,
      fiber: 1,
    });
    expect(meals[1].name).toContain('…');
    expect(meals[3]).toMatchObject({
      date: '2026-07-30',
      time: '12:20',
      calories: 418,
      protein: 13,
      fat: 25,
      carbs: 33,
      fiber: 1,
    });
    expect(meals[4]).toMatchObject({
      date: '2026-08-03',
      time: '04:21',
      calories: 280,
    });
  });

  it('joins meal name and macros across a page break', () => {
    const meals = calzenAdapter.parse(fixture);
    const split = meals.find((m) => m.time === '14:09');
    expect(split).toMatchObject({
      date: '2026-08-17',
      name: 'бутерброд с салями и сливочным маслом, черный чай',
      calories: 290,
      protein: 7,
      fat: 17,
      carbs: 25,
      fiber: 1,
    });
  });

  it('skips empty days', () => {
    const meals = calzenAdapter.parse(fixture);
    expect(meals.every((m) => m.date !== '2026-07-29')).toBe(true);
  });

  it('parses day headers with atypical month casing', () => {
    const lines = fixture.split(/\r?\n/);
    const dayHeader = lines[3]
      .replace('28', '15')
      .replace('июл', 'ИЮЛ');
    const macroLine = lines[5];

    const text = [
      lines[0],
      lines[1],
      lines[2],
      dayHeader,
      '12:00 test meal',
      macroLine,
    ].join('\n');

    const meals = calzenAdapter.parse(text);
    expect(meals).toHaveLength(1);
    expect(meals[0]).toMatchObject({
      date: '2026-07-15',
      time: '12:00',
      name: 'test meal',
    });
  });
});
