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

const PHOTO_TIPS = [
  {
    emoji: '☀️',
    text: 'Снимайте при хорошем свете — дневной свет без сильных теней и бликов',
  },
  {
    emoji: '🍽️',
    text: 'Вся тарелка или блюдо в кадре, без обрезанных краёв',
  },
  {
    emoji: '🧹',
    text: 'Уберите лишнее: руки, салфетки, упаковки и посторонние предметы',
  },
  {
    emoji: '📸',
    text: 'Снимайте сверху и достаточно близко — крупный план еды',
  },
  {
    emoji: '🎯',
    text: 'Один приём пищи за раз, камера ровно и без сильного размытия',
  },
] as const;

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

      <section className="rounded-xl border border-border bg-muted/40 p-4 text-left">
        <h3 className="text-base font-semibold text-foreground">
          Как фотографировать еду
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Так ИИ лучше поймёт, что на фото
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {PHOTO_TIPS.map((tip) => (
            <li key={tip.text} className="flex items-start gap-2.5 text-sm">
              <span className="shrink-0 leading-5" aria-hidden="true">
                {tip.emoji}
              </span>
              <span className="text-foreground/90 leading-5">{tip.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <Button onClick={onStart}>Начать 🚀</Button>
    </div>
  );
}
