import type { DailyTargets } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { OnboardingStepHeader } from './OnboardingStepHeader';

interface OnboardingResultProps {
  targets: DailyTargets;
  onStart: () => void;
}

const MACRO_EMOJI: Record<string, string> = {
  Белки: '🥩',
  Жиры: '🥑',
  Углеводы: '🍞',
  Клетчатка: '🥦',
};

export function OnboardingResult({ targets, onStart }: OnboardingResultProps) {
  const rows = [
    { label: 'Белки', value: `${targets.protein} г` },
    { label: 'Жиры', value: `${targets.fat} г` },
    { label: 'Углеводы', value: `${targets.carbs} г` },
    { label: 'Клетчатка', value: `${targets.fiber} г` },
  ];

  return (
    <div className="flex flex-col gap-6 text-center">
      <OnboardingStepHeader emoji="🎉" title="Ваши цели рассчитаны!" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl leading-none" aria-hidden="true">
          🔥
        </span>
        <span className="text-5xl font-bold text-primary">{targets.kcal}</span>
        <span className="text-muted-foreground">ккал в день</span>
      </div>
      <ul className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 text-left">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <span aria-hidden="true">{MACRO_EMOJI[row.label]}</span>
              {row.label}
            </span>
            <span className="font-medium">{row.value}</span>
          </li>
        ))}
      </ul>
      <Button onClick={onStart}>Начать 🚀</Button>
    </div>
  );
}
