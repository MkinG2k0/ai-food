import { useState } from 'react';
import type { UserProfile, Goal } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

interface StepGoalProps {
  onNext: (data: Pick<UserProfile, 'goal'>) => void;
}

const OPTIONS: { value: Goal; label: string; description: string; emoji: string }[] = [
  { value: 'lose', label: 'Похудеть', description: 'Дефицит калорий для снижения веса', emoji: '📉' },
  { value: 'maintain', label: 'Поддержать вес', description: 'Баланс для сохранения текущего веса', emoji: '⚖️' },
  { value: 'gain', label: 'Набрать массу', description: 'Профицит калорий для набора мышц', emoji: '💪' },
];

export function StepGoal({ onNext }: StepGoalProps) {
  const [selected, setSelected] = useState<Goal | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🎯" title="Ваша цель" />
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'rounded-xl border-2 px-4 py-4 text-left transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background',
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none" aria-hidden="true">
                {opt.emoji}
              </span>
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-sm text-muted-foreground">{opt.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => selected && onNext({ goal: selected })}>
        Готово
      </Button>
    </div>
  );
}
