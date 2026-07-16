import { Badge } from '@/shared/ui';

export interface FoodMacrosBadgesProps {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
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

export function FoodMacrosBadges({
  calories,
  protein,
  fat,
  carbs,
  fiber,
}: FoodMacrosBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold"
      >
        <MacroDigits value={calories} maxDigits={4} />
        <span>ккал</span>
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1 bg-blue-50 text-blue-700 border-blue-100 font-semibold"
      >
        <span>Б</span>
        <MacroDigits value={protein} maxDigits={3} />
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1 bg-red-50 text-red-700 border-red-100 font-semibold"
      >
        <span>Ж</span>
        <MacroDigits value={fat} maxDigits={3} />
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1 bg-amber-50 text-amber-700 border-amber-100 font-semibold"
      >
        <span>У</span>
        <MacroDigits value={carbs} maxDigits={3} />
        <span>г</span>
      </Badge>
      <Badge
        variant="secondary"
        className="gap-1 bg-teal-50 text-teal-700 border-teal-100 font-semibold"
      >
        <span>Кл</span>
        <MacroDigits value={fiber} maxDigits={3} />
        <span>г</span>
      </Badge>
    </div>
  );
}
