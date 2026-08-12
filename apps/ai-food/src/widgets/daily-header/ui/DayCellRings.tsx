import {
  enabledCalendarRings,
  type CalendarRingKey,
  type CalendarRingsSelection,
} from '@/features/settings';

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
  /** Which rings to draw (any subset of КБЖУ). */
  rings: CalendarRingsSelection;
  progress: DayCellRingProgress;
  hasReadyMeals: boolean;
  selected?: boolean;
  future?: boolean;
  /** Outer box size in px (even recommended for crisp SVG). */
  size?: number;
}

const TRACK = 'rgba(0,0,0,0.08)';

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function ringGeometry(count: number) {
  const n = Math.max(0, count);
  const stroke = n >= 4 ? 1.75 : n >= 3 ? 2 : 2.25;
  const gap = n >= 4 ? 1.25 : n >= 3 ? 1.5 : 1.75;
  const discR = n >= 4 ? 11 : 12;
  const clear = n >= 4 ? 1.5 : 1.75;
  const innermost = discR + clear + stroke / 2;
  const outer =
    n <= 1 ? innermost : innermost + (n - 1) * (stroke + gap);
  // Room for stroke + round caps so the outer ring isn't clipped
  let box = Math.ceil((outer + stroke / 2 + 2) * 2);
  if (box % 2 !== 0) box += 1;
  // Floor so empty / single-digit days stay readable
  box = Math.max(box, n === 0 ? 40 : 42);
  return { stroke, gap, discR, clear, innermost, box };
}

/** Default cell size so outer rings fit without clipping. */
export function dayCellSizeForRingCount(count: number): number {
  return ringGeometry(count).box;
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
  const rings = keys.map((key) => ({ key, color: RING_COLORS[key] }));
  const n = rings.length;
  const { stroke, gap, discR, innermost, box: fitted } = ringGeometry(n);
  const box = size ?? fitted;
  const center = box / 2;
  const ringRadii =
    n === 0
      ? []
      : rings.map((_, index) => innermost + (n - 1 - index) * (stroke + gap));

  const labelFill = selected
    ? 'hsl(var(--background))'
    : future
      ? 'hsl(var(--muted-foreground) / 0.65)'
      : 'hsl(var(--foreground))';

  const showArcs = hasReadyMeals && n > 0;

  return (
    <span
      className="relative inline-block shrink-0 overflow-visible"
      style={{ width: box, height: box }}
      data-testid="day-cell-rings"
      data-has-rings={showArcs ? 'true' : 'false'}
      data-ring-count={n}
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="block overflow-visible"
        aria-hidden
        data-testid="day-cell-rings-svg"
      >
        {showArcs &&
          rings.map((ring, index) => {
            const r = ringRadii[index]!;
            const c = 2 * Math.PI * r;
            const ratio = clamp01(progress[ring.key]);
            return (
              <g key={ring.key} transform={`rotate(-90 ${center} ${center})`}>
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
                  data-ring={ring.key as CalendarRingKey}
                />
              </g>
            );
          })}

        {selected && (
          <circle cx={center} cy={center} r={discR} className="fill-foreground" />
        )}

        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={600}
          style={{ fill: labelFill }}
        >
          {dayNumber}
        </text>
      </svg>
    </span>
  );
}
