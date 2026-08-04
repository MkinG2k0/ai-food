import { useState } from 'react';
import type { UserProfile, DietType } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

interface StepDietProps {
  onNext: (data: Pick<UserProfile, 'dietType'>) => void;
}

const OPTIONS: { value: DietType; label: string; description: string; emoji: string }[] = [
  {
    value: 'none',
    label: 'Без ограничений',
    description: 'Нет специальных диетических ограничений',
    emoji: '🍽️',
  },
  {
    value: 'halal',
    label: 'Халяль',
    description: 'Только халяль-продукты, без свинины и запрещённого мяса',
    emoji: '☪️',
  },
  {
    value: 'vegan',
    label: 'Веган',
    description: 'Без продуктов животного происхождения',
    emoji: '🌱',
  },
  {
    value: 'vegetarian',
    label: 'Вегетарианство',
    description: 'Без мяса и рыбы; молочные продукты и яйца допустимы',
    emoji: '🥬',
  },
];

export function StepDiet({ onNext }: StepDietProps) {
  const [selected, setSelected] = useState<DietType | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🥗" title="Тип питания" />
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
      <Button
        disabled={!selected}
        onClick={() => selected && onNext({ dietType: selected })}
      >
        Далее
      </Button>
    </div>
  );
}
