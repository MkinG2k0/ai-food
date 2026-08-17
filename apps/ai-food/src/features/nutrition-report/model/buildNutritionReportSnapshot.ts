import { Capacitor } from '@capacitor/core';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { useWeightStore } from '@/features/stats';
import { buildNutritionReportData, type NutritionReportData } from './buildReportData';
import type { ReportPeriod } from './reportPeriods';

export function buildNutritionReportSnapshot(period: ReportPeriod): NutritionReportData {
  return buildNutritionReportData({
    period,
    meals: useDiaryStore.getState().meals,
    profile: useProfileStore.getState().profile,
    targets: useProfileStore.getState().targets,
    weightEntries: useWeightStore.getState().entries,
    weightGoalKg: useWeightStore.getState().goalKg,
  });
}

export function canSharePdf(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof navigator.share !== 'function') return false;
  try {
    const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
    return navigator.canShare?.({ files: [probe] }) ?? false;
  } catch {
    return false;
  }
}
