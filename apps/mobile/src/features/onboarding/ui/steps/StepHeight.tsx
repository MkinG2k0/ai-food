import { useState } from 'react';
import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';

const MIN = 140;
const MAX = 220;

interface StepHeightProps {
  onNext: (data: Pick<UserProfile, 'height'>) => void;
}

export function StepHeight({ onNext }: StepHeightProps) {
  const [value, setValue] = useState(170);

  function handleChange(raw: number) {
    setValue(Math.min(MAX, Math.max(MIN, raw)));
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-center">Ваш рост</h2>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            min={MIN}
            max={MAX}
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-center text-2xl font-bold"
          />
          <span className="text-muted-foreground">см</span>
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <span className="text-sm text-muted-foreground">{MIN} — {MAX} см</span>
      </div>
      <Button onClick={() => onNext({ height: value })}>Далее</Button>
    </div>
  );
}
