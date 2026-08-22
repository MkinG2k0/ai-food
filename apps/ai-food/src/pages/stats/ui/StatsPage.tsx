import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { useDiaryStore } from '@/entities/meal';
import { NutritionReportSheet } from '@/features/nutrition-report';
import {
  syncNutritionProfileToServer,
  useProfileStore,
} from '@/features/onboarding';
import {
  WeeklyCaloriesChart,
  WeeklyMicronutrientsChart,
  WeightProgressCard,
  type StatsPeriod,
} from '@/features/stats';
import { useSettingsStore } from '@/features/settings';
import { Button, SubpageShell } from '@/shared/ui';

const FALLBACK_GOAL_KCAL = 2000;

export function StatsPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);
  const profile = useProfileStore((s) => s.profile);
  const targets = useProfileStore((s) => s.targets);
  const micronutrientTargets = useProfileStore((s) => s.micronutrientTargets);
  const updateTargetWeight = useProfileStore((s) => s.updateTargetWeight);
  const featureVitamins = useSettingsStore((s) => s.featureVitamins);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [offset, setOffset] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const goalKcal = targets?.kcal ?? FALLBACK_GOAL_KCAL;

  function togglePeriod() {
    setPeriod((current) => (current === 'week' ? 'month' : 'week'));
    setOffset(0);
  }

  return (
    <SubpageShell
      title="Статистика"
      onBack={() => navigate('/')}
      headerClassName="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur-sm"
      mainClassName="space-y-3 pb-10"
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={togglePeriod}
          aria-label={
            period === 'week'
              ? 'Показать статистику за месяц'
              : 'Показать статистику за неделю'
          }
        >
          {period === 'week' ? 'Месяц' : 'Неделя'}
        </Button>
      }
    >
      {profile && (
        <WeightProgressCard
          profileWeight={profile.weight}
          profileGoal={profile.goal}
          profileTargetWeight={profile.targetWeight}
          profileTargetWeightDate={profile.targetWeightDate}
          profilePlanStartDate={profile.planStartDate}
          profilePlanStartWeight={profile.planStartWeight}
          onTargetWeightChange={(kg) => {
            updateTargetWeight(kg);
            syncNutritionProfileToServer();
          }}
        />
      )}

      <WeeklyCaloriesChart
        meals={meals}
        period={period}
        offset={offset}
        onOffsetChange={(delta) => setOffset((o) => o + delta)}
        goalKcal={goalKcal}
      />
      {featureVitamins && (
        <>
          <WeeklyMicronutrientsChart
            meals={meals}
            period={period}
            offset={offset}
            onOffsetChange={(delta) => setOffset((o) => o + delta)}
            micronutrientTargets={micronutrientTargets}
          />
        </>
      )}

      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40"
        onClick={() => setReportOpen(true)}
      >
        <FileText
          className="h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Отчёт о питании</span>
          <span className="block text-sm text-muted-foreground">
            PDF со сводкой по калориям, БЖУ, весу и дневником за период
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>

      <NutritionReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </SubpageShell>
  );
}
