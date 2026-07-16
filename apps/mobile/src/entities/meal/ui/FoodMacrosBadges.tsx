import { Badge } from '@/shared/ui';

export interface FoodMacrosBadgesProps {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  density?: 'badges' | 'compact';
}

function MacroDigits({ value, maxDigits }: { value: number; maxDigits: number }) {
  return (
    <span
      className="inline-block text-right tabular-nums"
      style={{ width: `${maxDigits}ch` }}
    >
      {Math.round(value)}
    </span>
  );
}

function LetterCircle({
  letter,
  className,
}: {
  letter: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none text-white ${className}`}
      aria-hidden
    >
      {letter}
    </span>
  );
}

function CompactMacros({
  calories,
  protein,
  fat,
  carbs,
  fiber,
}: Omit<FoodMacrosBadgesProps, 'density'>) {
  return (
    <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
      <div className="flex shrink-0 items-baseline gap-1 text-emerald-700">
        <span className="text-lg font-semibold tabular-nums leading-none">
          {Math.round(calories)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">ккал</span>
      </div>
      <div className="flex min-w-0 flex-nowrap items-center gap-3 overflow-hidden">
        <span className="inline-flex shrink-0 items-center gap-1">
          <LetterCircle letter="Б" className="bg-blue-500" />
          <MacroDigits value={protein} maxDigits={3} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <LetterCircle letter="Ж" className="bg-red-500" />
          <MacroDigits value={fat} maxDigits={3} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <LetterCircle letter="У" className="bg-amber-500" />
          <MacroDigits value={carbs} maxDigits={3} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <LetterCircle letter="К" className="bg-teal-500" />
          <MacroDigits value={fiber} maxDigits={3} />
        </span>
      </div>
    </div>
  );
}

export function FoodMacrosBadges({
  calories,
  protein,
  fat,
  carbs,
  fiber,
  density = 'badges',
}: FoodMacrosBadgesProps) {
  if (density === 'compact') {
    return (
      <CompactMacros
        calories={calories}
        protein={protein}
        fat={fat}
        carbs={carbs}
        fiber={fiber}
      />
    );
  }

  return (
    <div className="flex flex-nowrap gap-0.5 overflow-hidden">
      <Badge
        variant="secondary"
        className="shrink-0 gap-0.5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold"
      >
        <span className="tabular-nums">{Math.round(calories)}</span>
        <span>ккал</span>
      </Badge>
      <Badge
        variant="secondary"
        className="shrink-0 gap-0.5 px-1.5 bg-blue-50 text-blue-700 border-blue-100 font-semibold"
      >
        <span>Б</span>
        <span className="tabular-nums">{Math.round(protein)}</span>
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="shrink-0 gap-0.5 px-1.5 bg-red-50 text-red-700 border-red-100 font-semibold"
      >
        <span>Ж</span>
        <span className="tabular-nums">{Math.round(fat)}</span>
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="shrink-0 gap-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-100 font-semibold"
      >
        <span>У</span>
        <span className="tabular-nums">{Math.round(carbs)}</span>
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="shrink-0 gap-0.5 px-1.5 bg-teal-50 text-teal-700 border-teal-100 font-semibold"
      >
        <span>К</span>
        <span className="tabular-nums">{Math.round(fiber)}</span>
        <span>г</span>
      </Badge>
    </div>
  );
}
