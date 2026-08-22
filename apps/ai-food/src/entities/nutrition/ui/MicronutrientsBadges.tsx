import { useState } from 'react';
import type { MicronutrientEstimate } from '@ai-food/shared-types';
import { Badge, Button } from '@/shared/ui';
import {
  formatMicronutrientUnit,
  isPriorityMicronutrient,
  MICRONUTRIENT_SHORT_LABELS,
} from '../model/micronutrientLabels';
import { getMicronutrientStatus } from '../model/micronutrientStatus';

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
  const [showAll, setShowAll] = useState(false);
  const targetById = new Map((targets ?? []).map((t) => [t.id, t]));

  const withAmount = (micronutrients ?? []).filter(
    (row) =>
      typeof row.amount === 'number' &&
      Number.isFinite(row.amount) &&
      row.amount > 0,
  );

  if (withAmount.length === 0) return null;

  const hasExtra = withAmount.some((row) => !isPriorityMicronutrient(row.id));
  const visible = showAll
    ? withAmount
    : withAmount.filter((row) => isPriorityMicronutrient(row.id));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">Витамины и минералы</span>
      </div>
      <div
        className="grid grid-cols-3 gap-1.5"
        role="list"
        aria-label="Витамины и минералы"
      >
        {visible.map((row) => {
          const norm = targetById.get(row.id);
          const ratio =
            norm && norm.amount > 0 ? row.amount / norm.amount : null;
          const status = getMicronutrientStatus(ratio);

          return (
            <Badge
              key={row.id}
              variant="secondary"
              role="listitem"
              className={`w-full justify-center gap-0.5 whitespace-nowrap px-1.5 py-1 text-[11px] font-medium leading-tight tabular-nums ${status.badgeClass}`}
            >
              <span>{MICRONUTRIENT_SHORT_LABELS[row.id]}</span>
              <span className="opacity-80">
                {formatAmount(row.amount)} {formatMicronutrientUnit(row.unit)}
              </span>
            </Badge>
          );
        })}
      </div>
      {hasExtra ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 py-0.5 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => setShowAll((v) => !v)}
          data-testid="micronutrients-badges-toggle-all"
        >
          {showAll ? 'Свернуть' : 'Развернуть'}
        </Button>
      ) : null}
    </div>
  );
}
