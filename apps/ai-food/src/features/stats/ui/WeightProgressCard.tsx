import { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { Goal } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import {
  latestWeightKg,
  useWeightStore,
} from '../model/useWeightStore';
import {
  addLocalDays,
  clampViewEndYmd,
  computeWeightRange,
  defaultGoalKg,
  defaultViewEndYmd,
  evaluateWeightPaceStatus,
  formatWeightDeadlineCopy,
  getIdealSegmentInWindow,
  goalTitle,
  isGoalReached,
  parseLocalYmd,
  remainingCopy,
  toLocalYmd,
  viewStartFromEnd,
} from '../model/weightProgress';
import { LogWeightSheet } from './LogWeightSheet';
import { UpdateGoalSheet } from './UpdateGoalSheet';
import { WeightTrendChart } from './WeightTrendChart';
import { queueWeightSync } from '@/features/weight-sync';

interface WeightProgressCardProps {
  profileWeight: number;
  profileGoal: Goal;
  /** Target weight from onboarding / profile (source of truth until overridden). */
  profileTargetWeight?: number | null;
  /** Deadline YYYY-MM-DD from profile; shown next to remaining copy. */
  profileTargetWeightDate?: string | null;
  /** Onboarding plan start day (YYYY-MM-DD). */
  profilePlanStartDate?: string | null;
  /** Weight snapshot at onboarding finish. */
  profilePlanStartWeight?: number | null;
  /** Persist a new goal back to the nutrition profile. */
  onTargetWeightChange?: (kg: number) => void;
}

export function WeightProgressCard({
  profileWeight,
  profileGoal,
  profileTargetWeight = null,
  profileTargetWeightDate = null,
  profilePlanStartDate = null,
  profilePlanStartWeight = null,
  onTargetWeightChange,
}: WeightProgressCardProps) {
  const entries = useWeightStore((s) => s.entries);
  const goalKg = useWeightStore((s) => s.goalKg);
  const addEntry = useWeightStore((s) => s.addEntry);
  const setGoalKg = useWeightStore((s) => s.setGoalKg);
  const ensureGoalKg = useWeightStore((s) => s.ensureGoalKg);
  const seedFromOnboarding = useWeightStore((s) => s.seedFromOnboarding);
  const [logOpen, setLogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const healedPlanStartKey = useRef<string | null>(null);

  const currentKg = latestWeightKg(entries, profileWeight) ?? profileWeight;
  const softDefault = defaultGoalKg(profileWeight, profileGoal);
  const effectiveGoal = goalKg ?? profileTargetWeight ?? softDefault;
  const todayYmd = toLocalYmd(new Date());

  useEffect(() => {
    if (
      profilePlanStartDate == null ||
      profilePlanStartWeight == null ||
      profileTargetWeight == null
    ) {
      return;
    }
    const key = `${profilePlanStartDate}:${profilePlanStartWeight}`;
    const onStartDay = entries.find((e) => e.date === profilePlanStartDate);
    const missing = !onStartDay;
    const staleToday =
      profilePlanStartDate === todayYmd &&
      onStartDay != null &&
      onStartDay.kg !== profilePlanStartWeight &&
      healedPlanStartKey.current !== key;

    if (missing || staleToday) {
      seedFromOnboarding(
        profilePlanStartWeight,
        profilePlanStartDate,
        profileTargetWeight,
      );
      healedPlanStartKey.current = key;
    }
  }, [
    entries,
    profilePlanStartDate,
    profilePlanStartWeight,
    profileTargetWeight,
    seedFromOnboarding,
    todayYmd,
  ]);

  useEffect(() => {
    if (profileTargetWeight != null) {
      // Pull onboarding/profile goal — overrides stale soft-seed (±5 kg).
      const clamped =
        Math.min(300, Math.max(20, Math.round(profileTargetWeight * 10) / 10));
      if (goalKg !== clamped) {
        setGoalKg(clamped);
      }
      return;
    }
    ensureGoalKg(softDefault);
  }, [
    ensureGoalKg,
    goalKg,
    profileTargetWeight,
    setGoalKg,
    softDefault,
  ]);

  const range = useMemo(
    () =>
      computeWeightRange({
        planStartDate: profilePlanStartDate ?? undefined,
        targetWeightDate: profileTargetWeightDate ?? undefined,
        entryDates: entries.map((e) => e.date),
        todayYmd,
      }),
    [
      profilePlanStartDate,
      profileTargetWeightDate,
      entries,
      todayYmd,
    ],
  );

  const [viewEndYmd, setViewEndYmd] = useState(() =>
    defaultViewEndYmd(range.endYmd, todayYmd),
  );

  useEffect(() => {
    setViewEndYmd((prev) =>
      clampViewEndYmd(prev, range.startYmd, range.endYmd),
    );
  }, [range.startYmd, range.endYmd]);

  const clampedViewEnd = clampViewEndYmd(
    viewEndYmd,
    range.startYmd,
    range.endYmd,
  );
  const viewStartYmd = viewStartFromEnd(clampedViewEnd);
  const effectiveViewStartYmd =
    viewStartYmd < range.startYmd ? range.startYmd : viewStartYmd;

  const viewStart =
    parseLocalYmd(effectiveViewStartYmd) ?? new Date();
  const viewEnd = parseLocalYmd(clampedViewEnd) ?? new Date();

  const windowPoints = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.date >= effectiveViewStartYmd && e.date <= clampedViewEnd,
        )
        .map((e) => ({
          date: parseLocalYmd(e.date) ?? new Date(),
          kg: e.kg,
        })),
    [entries, effectiveViewStartYmd, clampedViewEnd],
  );

  const idealPoints = useMemo(() => {
    if (
      !profilePlanStartDate ||
      profilePlanStartWeight == null ||
      !profileTargetWeightDate
    ) {
      return [];
    }
    return getIdealSegmentInWindow({
      planStartDate: profilePlanStartDate,
      planStartWeight: profilePlanStartWeight,
      targetWeightDate: profileTargetWeightDate,
      goalKg: effectiveGoal,
      viewStartYmd: effectiveViewStartYmd,
      viewEndYmd: clampedViewEnd,
    });
  }, [
    profilePlanStartDate,
    profilePlanStartWeight,
    profileTargetWeightDate,
    effectiveGoal,
    effectiveViewStartYmd,
    clampedViewEnd,
  ]);

  const title = goalTitle(profileGoal);
  const reached = isGoalReached(
    currentKg,
    effectiveGoal,
    profileGoal,
    entries,
  );
  const suggestedNextGoal = defaultGoalKg(currentKg, profileGoal);
  const remaining = remainingCopy(
    currentKg,
    effectiveGoal,
    profileGoal,
    entries,
  );
  const progressLine = formatWeightDeadlineCopy(
    remaining,
    profileTargetWeightDate,
    reached,
  );
  const paceStatus = evaluateWeightPaceStatus({
    goal: profileGoal,
    currentKg,
    planStartDate: profilePlanStartDate,
    planStartWeight: profilePlanStartWeight,
    targetWeightDate: profileTargetWeightDate,
    goalKg: effectiveGoal,
    todayYmd,
    reached,
  });

  return (
    <div className="space-y-3">
      <section
        className={`rounded-2xl border p-4 shadow-sm ${
          reached
            ? 'border-primary/40 bg-primary/5'
            : 'border-border/80 bg-card'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {reached && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Цель достигнута
              </span>
            )}
            {!reached && paceStatus && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  paceStatus.kind === 'behind'
                    ? 'bg-amber-500/15 text-amber-800'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                {paceStatus.label}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant={reached ? 'outline' : 'default'}
            className="shrink-0 rounded-full"
            onClick={() => setLogOpen(true)}
          >
            + Записать вес
          </Button>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {currentKg.toFixed(1)}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                кг
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">сейчас</p>
          </div>
          <span className="mb-3 text-muted-foreground" aria-hidden>
            →
          </span>
          <div className="text-right">
            <p
              className={`text-3xl font-semibold tabular-nums tracking-tight ${
                reached ? 'text-primary' : ''
              }`}
            >
              {effectiveGoal.toFixed(1)}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                кг
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">цель</p>
          </div>
        </div>

        <p
          className={`mt-3 text-sm ${
            reached
              ? 'font-medium text-primary'
              : paceStatus?.kind === 'behind'
                ? 'text-amber-800'
                : 'text-muted-foreground'
          }`}
        >
          {progressLine}
        </p>

        {reached && (
          <Button
            className="mt-4 w-full rounded-full"
            onClick={() => setGoalOpen(true)}
          >
            Обновить цель
          </Button>
        )}
      </section>

      <WeightTrendChart
        points={windowPoints}
        idealPoints={idealPoints}
        goalKg={effectiveGoal}
        viewStart={viewStart}
        viewEnd={viewEnd}
        onPanDays={(deltaDays) => {
          const next = toLocalYmd(
            addLocalDays(parseLocalYmd(clampedViewEnd) ?? new Date(), deltaDays),
          );
          setViewEndYmd(
            clampViewEndYmd(next, range.startYmd, range.endYmd),
          );
        }}
      />

      <LogWeightSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        initialKg={currentKg}
        onSave={(kg, date) => {
          addEntry(kg, date);
          queueWeightSync({ mode: 'full' });
        }}
      />

      <UpdateGoalSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        initialGoalKg={suggestedNextGoal}
        currentKg={currentKg}
        onSave={(nextGoal) => {
          onTargetWeightChange?.(nextGoal);
          setGoalKg(nextGoal);
          queueWeightSync({ mode: 'full' });
        }}
      />
    </div>
  );
}
