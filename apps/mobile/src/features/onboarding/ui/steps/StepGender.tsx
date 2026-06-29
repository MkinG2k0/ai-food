import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

interface StepGenderProps {
  onNext: (data: Pick<UserProfile, 'gender'>) => void;
}

export function StepGender({ onNext }: StepGenderProps) {
  const [selected, setSelected] = useState<UserProfile['gender'] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-center">Ваш пол</h2>
      <div className="flex gap-4">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setSelected(g)}
            className={cn(
              'flex-1 rounded-xl border-2 py-6 text-base font-medium transition-colors',
              selected === g
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background text-foreground',
            )}
          >
            {g === 'male' ? 'Мужской' : 'Женский'}
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => selected && onNext({ gender: selected })}>
        Далее
      </Button>
    </div>
  );
}
