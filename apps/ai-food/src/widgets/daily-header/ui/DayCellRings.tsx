import type { CalendarRingMode } from '@/features/settings';

export const RING_COLORS = {
  kcal: '#10B981',
  protein: '#FB7185',
  fat: '#FBBF24',
  carbs: '#0EA5E9',
} as const;

export interface DayCellRingProgress {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface DayCellRingsProps {
  dayNumber: number;
  mode: CalendarRingMode;
  progress: DayCellRingProgress;
  hasReadyMeals: boolean;
  selected?: boolean;
  future?: boolean;
  size?: number;
}

const TRACK = 'rgba(0,0,0,0.08)';

function ringsForMode(
  mode: CalendarRingMode,
): { key: keyof typeof RING_COLORS; color: string }[] {
  if (mode === 'kcal') {
    return [{ key: 'kcal', color: RING_COLORS.kcal }];
  }
  if (mode === 'kcal_protein') {
    return [
      { key: 'kcal', color: RING_COLORS.kcal },
      { key: 'protein', color: RING_COLORS.protein },
    ];
  }
  return [
    { key: 'kcal', color: RING_COLORS.kcal },
    { key: 'protein', color: RING_COLORS.protein },
    { key: 'fat', color: RING_COLORS.fat },
    { key: 'carbs', color: RING_COLORS.carbs },
  ];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Concentric progress arcs around a day number (Apple Activity style).
 * Rings only when the day has ready meals (D-04).
 */
export function DayCellRings({
  dayNumber,
  mode,
  progress,
  hasReadyMeals,
  selected = false,
  future = false,
  size = 36,
}: DayCellRingsProps) {
  const rings = ringsForMode(mode);
  const stroke = mode === 'full' ? 1.75 : 2.25;
  const gap = 1.25;
  const center = size / 2;
  // Selected: solid disc leaves room for outer rings
  const numberRadius = selected ? size * 0.28 : size * 0.22;
  const innermost =
    numberRadius + (selected ? stroke + gap + 1 : stroke / 2 + 1);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="day-cell-rings"
      data-has-rings={hasReadyMeals ? 'true' : 'false'}
      data-mode={mode}
    >
      {hasReadyMeals && (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden
          data-testid="day-cell-rings-svg"
        >
          {rings.map((ring, index) => {
            const r = innermost + index * (stroke + gap);
            const c = 2 * Math.PI * r;
            const ratio = clamp01(progress[ring.key]);
            return (
              <g key={ring.key}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={TRACK}
                  strokeWidth={stroke}
                />
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - ratio)}
                  data-ring={ring.key}
                />
              </g>
            );
          })}
        </svg>
      )}
      <span
        className={`relative z-[1] flex items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors ${
          selected
            ? 'bg-foreground text-background'
            : future
              ? 'text-muted-foreground'
              : 'text-foreground'
        }`}
        style={
          selected
            ? { width: numberRadius * 2, height: numberRadius * 2 }
            : undefined
        }
      >
        {dayNumber}
      </span>
    </span>
  );
}
