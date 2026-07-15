import { useState } from 'react';
import type { UserProfile, DietType } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

interface StepDietProps {
  onNext: (data: Pick<UserProfile, 'dietType'>) => void;
}

const OPTIONS: { value: DietType; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'Без ограничений',
    description: 'Нет специальных диетических ограничений',
  },
  {
    value: 'halal',
    label: 'Халяль',
    description: 'Только халяль-продукты, без свинины и запрещённого мяса',
  },
  {
    value: 'vegan',
    label: 'Веган',
    description: 'Без продуктов животного происхождения',
  },
  {
    value: 'vegetarian',
    label: 'Вегетарианство',
    description: 'Без мяса и рыбы; молочные продукты и яйца допустимы',
  },
];

export function StepDiet({ onNext }: StepDietProps) {
  const [selected, setSelected] = useState<DietType | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-center">Тип питания</h2>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
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
      <Button
        disabled={!selected}
        onClick={() => selected && onNext({ dietType: selected })}
      >
        Далее
      </Button>
    </div>
  );
}
