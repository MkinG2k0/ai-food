import { describe, expect, it } from 'vitest';
import { timestampFromLocalDateTime } from './timestampFromLocalDateTime';

describe('timestampFromLocalDateTime', () => {
  it('builds ISO from local Y-M-D and HH:mm', () => {
    const iso = timestampFromLocalDateTime('2026-07-28', '01:33');
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(1);
    expect(d.getMinutes()).toBe(33);
  });
});
