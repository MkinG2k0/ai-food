import { describe, expect, it } from 'vitest';
import { NEWS_CHANGELOG } from './changelog';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('NEWS_CHANGELOG', () => {
  it('is non-empty with valid releases', () => {
    expect(NEWS_CHANGELOG.length).toBeGreaterThan(0);
    for (const release of NEWS_CHANGELOG) {
      expect(release.date).toMatch(ISO_DATE);
      expect(release.title.trim().length).toBeGreaterThan(0);
      expect(release.items.length).toBeGreaterThan(0);
      for (const item of release.items) {
        expect(item.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('is sorted newest-first by date', () => {
    for (let i = 1; i < NEWS_CHANGELOG.length; i++) {
      expect(NEWS_CHANGELOG[i - 1].date >= NEWS_CHANGELOG[i].date).toBe(true);
    }
  });
});
