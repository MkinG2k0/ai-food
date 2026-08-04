import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

interface StepGenderProps {
  onNext: (data: Pick<UserProfile, 'gender'>) => void;
}

const OPTIONS: { value: UserProfile['gender']; label: string; emoji: string }[] = [
  { value: 'male', label: 'Мужской', emoji: '👨' },
  { value: 'female', label: 'Женский', emoji: '👩' },
];

export function StepGender({ onNext }: StepGenderProps) {
  const [selected, setSelected] = useState<UserProfile['gender'] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="👤" title="Ваш пол" />
      <div className="flex gap-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 py-6 text-base font-medium transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background text-foreground',
            )}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {opt.emoji}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => selected && onNext({ gender: selected })}>
        Далее
      </Button>
    </div>
  );
}
