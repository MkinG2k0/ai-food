import { describe, expect, it } from 'vitest';
import { average, p50, p95, percentileSorted } from './percentile.js';

describe('percentile helpers', () => {
  it('returns null for empty', () => {
    expect(average([])).toBeNull();
    expect(p50([])).toBeNull();
    expect(p95([])).toBeNull();
  });

  it('average is arithmetic mean', () => {
    expect(average([10, 20, 30])).toBe(20);
  });

  it('p50 / p95 nearest-rank on 1..10', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // index = ceil(p/100 * n) - 1 → p50:4 → 5; p95:9 → 10
    expect(p50(values)).toBe(5);
    expect(p95(values)).toBe(10);
    expect(percentileSorted([...values], 50)).toBe(5);
  });
});
