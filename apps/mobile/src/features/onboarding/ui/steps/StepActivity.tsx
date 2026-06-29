import { useState } from 'react';
import type { UserProfile, ActivityLevel } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

interface StepActivityProps {
  onNext: (data: Pick<UserProfile, 'activity'>) => void;
}

const OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'low', label: 'Низкая', description: 'Сидячий образ жизни' },
  { value: 'medium', label: 'Средняя', description: 'Умеренные тренировки 1–3 раза в неделю' },
  { value: 'high', label: 'Высокая', description: 'Интенсивные тренировки 4+ раз в неделю' },
];

export function StepActivity({ onNext }: StepActivityProps) {
  const [selected, setSelected] = useState<ActivityLevel | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-center">Уровень активности</h2>
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
            <div className="font-medium">{opt.label}</div>
            <div className="text-sm text-muted-foreground">{opt.description}</div>
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => selected && onNext({ activity: selected })}>
        Далее
      </Button>
    </div>
  );
}
