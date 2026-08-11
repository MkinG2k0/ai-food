import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { isFutureDay } from '@/shared/lib';
import { Button } from '@/shared/ui';
import { evaluateWeightPace } from '../../model/evaluateWeightPace';
import { PACE_WARNING_STEP } from '../../model/paceWarningCopy';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';
import { PaceDeadlineCalendar } from '../PaceDeadlineCalendar';

const MIN = 1;
const MAX = 500;
const DEFAULT_DEADLINE_DAYS = 90;
/** Suggest target ~5% above current so the slider isn't stuck on the same number
 *  and a default ~90-day deadline stays inside the safe pace clamp for typical weights. */
const DEFAULT_TARGET_WEIGHT_FACTOR = 1.05;

function defaultTargetWeight(currentWeight: number): number {
  const suggested =
    Math.round(currentWeight * DEFAULT_TARGET_WEIGHT_FACTOR * 10) / 10;
  return Math.min(MAX, Math.max(MIN, suggested));
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function defaultDeadlineDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_DEADLINE_DAYS);
  return toDateInputValue(d);
}

interface StepTargetWeightProps {
  onNext: (data: Pick<UserProfile, 'targetWeight' | 'targetWeightDate'>) => void;
  currentWeight: number;
}

export function StepTargetWeight({
  onNext,
  currentWeight,
}: StepTargetWeightProps) {
  const initial = defaultTargetWeight(currentWeight);

  const {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  } = useNumericRangeInput(MIN, MAX, initial);

  const [targetWeightDate, setTargetWeightDate] = useState(defaultDeadlineDate);
  const parsedDate = parseDateInputValue(targetWeightDate);
  const dateValid = parsedDate !== null && isFutureDay(parsedDate);
  const pace =
    dateValid && parsedDate
      ? evaluateWeightPace({
          weight: currentWeight,
          targetWeight: value,
          targetWeightDate,
        })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🎯" title="Желаемый вес" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        unit="кг"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <div className="space-y-2">
        <span className="text-sm font-medium">До какого числа</span>
        <p className="text-xs text-muted-foreground">
          Цвет дня — насколько реально успеть к этой дате
        </p>
        <PaceDeadlineCalendar
          weight={currentWeight}
          targetWeight={value}
          value={targetWeightDate}
          onChange={setTargetWeightDate}
        />
      </div>
      <div className="min-h-[4.5rem]">
        {pace?.clamped && (
          <p
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-sm text-foreground"
          >
            {PACE_WARNING_STEP}
          </p>
        )}
      </div>
      <Button
        disabled={!dateValid}
        onClick={() => {
          if (!dateValid) return;
          onNext({
            targetWeight: getCommittedValue(),
            targetWeightDate,
          });
        }}
      >
        Далее
      </Button>
    </div>
  );
}
