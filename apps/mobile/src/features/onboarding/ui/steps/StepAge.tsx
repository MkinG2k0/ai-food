import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';

const MIN = 15;
const MAX = 80;

interface StepAgeProps {
  onNext: (data: Pick<UserProfile, 'age'>) => void;
}

export function StepAge({ onNext }: StepAgeProps) {
  const [value, setValue] = useState(25);

  function handleChange(raw: number) {
    if (isNaN(raw)) return;
    setValue(Math.min(MAX, Math.max(MIN, raw)));
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-center">Ваш возраст</h2>
      <div className="flex flex-col items-center gap-4">
        <input
          type="number"
          min={MIN}
          max={MAX}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-center text-2xl font-bold"
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <span className="text-sm text-muted-foreground">{MIN} — {MAX} лет</span>
      </div>
      <Button onClick={() => onNext({ age: value })}>Далее</Button>
    </div>
  );
}
