import { describe, it, expect } from 'vitest';
import { buildTermsSections } from './termsContent';

describe('buildTermsSections', () => {
  it('interpolates rubles and duration when price known', () => {
    const sections = buildTermsSections({
      amountKopecks: 10_000,
      durationDays: 365,
    });
    const priceSection = sections.find((s) => s.title.includes('Цена'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(/100/);
    expect(priceSection?.paragraphs.join(' ')).toMatch(/365/);
  });

  it('uses fallback wording when price null', () => {
    const sections = buildTermsSections({
      amountKopecks: null,
      durationDays: null,
    });
    const priceSection = sections.find((s) => s.title.includes('Цена'));
    expect(priceSection?.paragraphs.join(' ')).toMatch(
      /актуальн(ая|ый) (цена|тариф)|экране оплаты/i,
    );
  });
});
