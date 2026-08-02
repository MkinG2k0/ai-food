import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { isFutureDay } from '@/shared/lib';
import { Button } from '@/shared/ui';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

const MIN = 1;
const MAX = 500;
const DEFAULT_DEADLINE_DAYS = 90;
/** Suggest target ~15% above current so the slider isn't stuck on the same number. */
const DEFAULT_TARGET_WEIGHT_FACTOR = 1.15;

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

function tomorrowDateInputValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
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
  const minDate = tomorrowDateInputValue();
  const parsedDate = parseDateInputValue(targetWeightDate);
  const dateValid = parsedDate !== null && isFutureDay(parsedDate);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🎯" title="Желаемый вес" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        unit="кг"
        rangeSuffix="кг"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <label className="block space-y-2">
        <span className="text-sm font-medium">До какого числа</span>
        <input
          type="date"
          value={targetWeightDate}
          min={minDate}
          onChange={(e) => setTargetWeightDate(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base tabular-nums"
        />
      </label>
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
