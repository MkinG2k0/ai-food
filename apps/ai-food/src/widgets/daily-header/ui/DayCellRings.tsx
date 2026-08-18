import {
  enabledCalendarRings,
  type CalendarRingsSelection,
} from '@/features/settings';
import {
  ProgressRings,
  RING_COLORS,
  dayCellSizeForRingCount,
  type KbjuRingProgress,
} from '@/shared/ui';

export { RING_COLORS, dayCellSizeForRingCount };

export type DayCellRingProgress = KbjuRingProgress;

interface DayCellRingsProps {
  dayNumber: number;
  /** Which rings to draw (any subset of КБЖУ). */
  rings: CalendarRingsSelection;
  progress: DayCellRingProgress;
  hasReadyMeals: boolean;
  selected?: boolean;
  future?: boolean;
  /** Outer box size in px (even recommended for crisp SVG). */
  size?: number;
}

/**
 * Concentric progress arcs around a day number.
 * Digit + disc + rings share one SVG origin (no CSS/HTML centering drift).
 * Ring order outer→inner among enabled: kcal → protein → fat → carbs.
 */
export function DayCellRings({
  dayNumber,
  rings: ringsSelection,
  progress,
  hasReadyMeals,
  selected = false,
  future = false,
  size,
}: DayCellRingsProps) {
  const keys = enabledCalendarRings(ringsSelection);

  return (
    <ProgressRings
      label={dayNumber}
      progress={progress}
      keys={keys}
      showArcs={hasReadyMeals && keys.length > 0}
      selected={selected}
      future={future}
      size={size}
      testId="day-cell-rings"
    />
  );
}
