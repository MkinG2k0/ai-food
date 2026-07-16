import type { MicronutrientEstimate } from '@ai-food/shared-types';
import { Badge } from '@/shared/ui';
import {
  formatMicronutrientUnit,
  MICRONUTRIENT_SHORT_LABELS,
} from '../model/micronutrientLabels';

export interface MicronutrientsBadgesProps {
  micronutrients?: MicronutrientEstimate[];
  /** Optional daily norms — subtle tint by % of norm when present */
  targets?: MicronutrientEstimate[] | null;
}

function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(1).replace(/\.0$/, '');
}

export function MicronutrientsBadges({
  micronutrients,
  targets,
}: MicronutrientsBadgesProps) {
  const targetById = new Map((targets ?? []).map((t) => [t.id, t]));

  const visible = (micronutrients ?? []).filter(
    (row) =>
      typeof row.amount === 'number' &&
      Number.isFinite(row.amount) &&
      row.amount > 0,
  );

  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">Витамины и минералы</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map((row) => {
          const norm = targetById.get(row.id);
          const pct =
            norm && norm.amount > 0 ? Math.min(row.amount / norm.amount, 1.5) : null;
          const tintClass =
            pct == null
              ? 'bg-secondary text-secondary-foreground'
              : pct >= 0.8
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : pct >= 0.4
                  ? 'bg-amber-50 text-amber-800 border-amber-100'
                  : 'bg-slate-50 text-slate-600 border-slate-100';

          return (
            <Badge
              key={row.id}
              variant="secondary"
              className={`gap-1 font-medium ${tintClass}`}
            >
              <span>{MICRONUTRIENT_SHORT_LABELS[row.id]}</span>
              <span className="opacity-80">
                {formatAmount(row.amount)} {formatMicronutrientUnit(row.unit)}
              </span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
