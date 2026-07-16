import type {
  MicronutrientEstimate,
  MicronutrientLevel,
} from '@ai-food/shared-types';
import { Badge } from '@/shared/ui';
import { MICRONUTRIENT_SHORT_LABELS } from '../model/micronutrientLabels';

const LEVEL_LABEL: Record<Exclude<MicronutrientLevel, 'none'>, string> = {
  high: 'много',
  medium: 'средне',
  low: 'мало',
};

const LEVEL_CLASS: Record<Exclude<MicronutrientLevel, 'none'>, string> = {
  high: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  medium: 'bg-amber-50 text-amber-800 border-amber-100',
  low: 'bg-slate-50 text-slate-600 border-slate-100',
};

export interface MicronutrientsBadgesProps {
  micronutrients?: MicronutrientEstimate[];
}

export function MicronutrientsBadges({ micronutrients }: MicronutrientsBadgesProps) {
  const visible = (micronutrients ?? []).filter(
    (row): row is MicronutrientEstimate & { level: Exclude<MicronutrientLevel, 'none'> } =>
      row.level !== 'none',
  );

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">Витамины и минералы</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          оценка
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map((row) => (
          <Badge
            key={row.id}
            variant="secondary"
            className={`gap-1 font-medium ${LEVEL_CLASS[row.level]}`}
          >
            <span>{MICRONUTRIENT_SHORT_LABELS[row.id]}</span>
            <span className="opacity-70">{LEVEL_LABEL[row.level]}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
