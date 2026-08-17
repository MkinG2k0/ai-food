import { describe, expect, it } from 'vitest';
import {
  buildReportPeriodPresets,
  formatReportPeriodRange,
  inclusiveDayCount,
  previousCalendarWeek,
  reportFileName,
  rollingDaysEndingToday,
} from './reportPeriods';

describe('reportPeriods', () => {
  const today = new Date(2026, 7, 18, 15, 0, 0);

  it('rollingDaysEndingToday spans inclusive count', () => {
    const p = rollingDaysEndingToday(today, 7);
    expect(inclusiveDayCount(p.start, p.end)).toBe(7);
    expect(p.start.getDate()).toBe(12);
    expect(p.end.getDate()).toBe(18);
  });

  it('previousCalendarWeek is Mon–Sun before current week', () => {
    const p = previousCalendarWeek(today);
    expect(p.start.getDate()).toBe(10);
    expect(p.end.getDate()).toBe(16);
    expect(p.start.getDay()).toBe(1);
    expect(p.end.getDay()).toBe(0);
  });

  it('buildReportPeriodPresets matches CalZen ranges', () => {
    const presets = buildReportPeriodPresets(today);
    expect(presets).toHaveLength(4);
    expect(formatReportPeriodRange(presets[0]!.start, presets[0]!.end)).toContain('12');
    expect(formatReportPeriodRange(presets[1]!.start, presets[1]!.end)).toContain('10');
    expect(presets[2]!.start.getDate()).toBe(5);
    expect(presets[3]!.start.getDate()).toBe(20);
    expect(presets[3]!.start.getMonth()).toBe(6);
  });

  it('reportFileName uses ISO dates', () => {
    const start = new Date(2026, 7, 12);
    const end = new Date(2026, 7, 18);
    expect(reportFileName(start, end)).toBe(
      'ai-food-report-2026-08-12_2026-08-18.pdf',
    );
  });
});
