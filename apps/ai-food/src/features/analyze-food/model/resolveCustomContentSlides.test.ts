import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { resolveCustomContentSlides } from './resolveCustomContentSlides';

function baseMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'm1',
    timestamp: new Date().toISOString(),
    items: [],
    totalCalories: 100,
    ...overrides,
  };
}

describe('resolveCustomContentSlides', () => {
  it('returns empty when no content', () => {
    expect(resolveCustomContentSlides(undefined)).toEqual([]);
    expect(resolveCustomContentSlides(baseMeal())).toEqual([]);
    expect(resolveCustomContentSlides(baseMeal({ customContent: '' }))).toEqual(
      [],
    );
  });

  it('puts initial customContent first, then follow-ups', () => {
    const slides = resolveCustomContentSlides(
      baseMeal({
        customContent: '## Рецепт',
        customContentEntries: [
          {
            id: 'e1',
            question: 'Острота?',
            content: '1/5',
          },
          {
            id: 'e2',
            question: 'Энергия?',
            content: '4/5',
          },
        ],
      }),
    );
    expect(slides).toHaveLength(3);
    expect(slides[0].content).toBe('## Рецепт');
    expect(slides[0].question).toBeUndefined();
    expect(slides[1].question).toBe('Острота?');
    expect(slides[2].question).toBe('Энергия?');
  });

  it('skips empty follow-up contents', () => {
    const slides = resolveCustomContentSlides(
      baseMeal({
        customContentEntries: [
          { id: 'e1', question: 'x', content: '   ' },
          { id: 'e2', question: 'y', content: 'ok' },
        ],
      }),
    );
    expect(slides).toHaveLength(1);
    expect(slides[0].id).toBe('e2');
  });
});
