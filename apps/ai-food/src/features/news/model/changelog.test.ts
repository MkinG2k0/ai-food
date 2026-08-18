import { describe, expect, it } from 'vitest';
import { NEWS_CHANGELOG, shouldShowLatestNews, getLatestNewsRelease } from './changelog';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('NEWS_CHANGELOG', () => {
  it('is non-empty with valid releases', () => {
    expect(NEWS_CHANGELOG.length).toBeGreaterThan(0);
    for (const release of NEWS_CHANGELOG) {
      expect(release.date).toMatch(ISO_DATE);
      expect(release.title.trim().length).toBeGreaterThan(0);
      expect(release.emoji.trim().length).toBeGreaterThan(0);
      expect(release.items.length).toBeGreaterThan(0);
      for (const item of release.items) {
        expect(item.emoji.trim().length).toBeGreaterThan(0);
        expect(item.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('is sorted newest-first by date', () => {
    for (let i = 1; i < NEWS_CHANGELOG.length; i++) {
      expect(NEWS_CHANGELOG[i - 1].date >= NEWS_CHANGELOG[i].date).toBe(true);
    }
  });

  it('has unique dates', () => {
    const dates = NEWS_CHANGELOG.map((release) => release.date);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe('shouldShowLatestNews', () => {
  it('shows when nothing was dismissed yet', () => {
    expect(shouldShowLatestNews(null, '2026-08-19')).toBe(true);
  });

  it('hides after the same release was dismissed', () => {
    expect(shouldShowLatestNews('2026-08-19', '2026-08-19')).toBe(false);
  });

  it('shows again when a newer release appears', () => {
    expect(shouldShowLatestNews('2026-08-18', '2026-08-19')).toBe(true);
  });

  it('hides when changelog is empty', () => {
    expect(shouldShowLatestNews(null, undefined)).toBe(false);
  });
});

describe('getLatestNewsRelease', () => {
  it('returns the first changelog entry', () => {
    expect(getLatestNewsRelease()?.date).toBe(NEWS_CHANGELOG[0].date);
  });
});
