import type { DailyTargets } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';

interface OnboardingResultProps {
  targets: DailyTargets;
  onStart: () => void;
}

export function OnboardingResult({ targets, onStart }: OnboardingResultProps) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <h2 className="text-xl font-semibold">Ваши цели рассчитаны!</h2>
      <div className="flex flex-col items-center gap-1">
        <span className="text-5xl font-bold text-primary">{targets.kcal}</span>
        <span className="text-muted-foreground">ккал в день</span>
      </div>
      <ul className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 text-left">
        <li className="flex justify-between">
          <span className="text-muted-foreground">Белки</span>
          <span className="font-medium">{targets.protein} г</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Жиры</span>
          <span className="font-medium">{targets.fat} г</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Углеводы</span>
          <span className="font-medium">{targets.carbs} г</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted-foreground">Клетчатка</span>
          <span className="font-medium">{targets.fiber} г</span>
        </li>
      </ul>
      <Button onClick={onStart}>Начать</Button>
    </div>
  );
}
