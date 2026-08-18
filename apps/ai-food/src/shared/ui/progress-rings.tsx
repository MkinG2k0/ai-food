const EMERALD = '#10B981';

export const RING_COLORS = {
  kcal: EMERALD,
  protein: '#FB7185',
  fat: '#FBBF24',
  carbs: '#0EA5E9',
} as const;

/** Header bars + meal Б/Ж/У/К chips. Matches RING_COLORS hues. */
export const MACRO_COLORS = {
  protein: RING_COLORS.protein,
  fat: RING_COLORS.fat,
  carbs: RING_COLORS.carbs,
  fiber: EMERALD,
} as const;

export const MACRO_BAR_CLASSES = {
  protein: 'bg-rose-400',
  fat: 'bg-amber-400',
  carbs: 'bg-sky-500',
  fiber: 'bg-emerald-500',
} as const;

export type KbjuRingKey = keyof typeof RING_COLORS;

export interface KbjuRingProgress {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const KBJU_RING_ORDER: KbjuRingKey[] = [
  'kcal',
  'protein',
  'fat',
  'carbs',
];

interface ProgressRingsProps {
  label: string | number;
  progress: KbjuRingProgress;
  /** Keys to draw, outer → inner. Empty = no arcs. */
  keys?: KbjuRingKey[];
  showArcs?: boolean;
  selected?: boolean;
  future?: boolean;
  size?: number;
  testId?: string;
  'aria-label'?: string;
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
  let box = Math.ceil((outer + stroke / 2 + 2) * 2);
  if (box % 2 !== 0) box += 1;
  box = Math.max(box, n === 0 ? 40 : 42);
  return { stroke, gap, discR, innermost, box };
}

export function dayCellSizeForRingCount(count: number): number {
  return ringGeometry(count).box;
}

/**
 * Concentric КБЖУ arcs around a label (day number).
 * Digit + disc + rings share one SVG origin.
 */
export function ProgressRings({
  label,
  progress,
  keys = KBJU_RING_ORDER,
  showArcs = true,
  selected = false,
  future = false,
  size,
  testId = 'progress-rings',
  'aria-label': ariaLabel,
}: ProgressRingsProps) {
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

  const drawArcs = showArcs && n > 0;

  return (
    <span
      className="relative inline-block shrink-0 overflow-visible"
      style={{ width: box, height: box }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      data-has-rings={drawArcs ? 'true' : 'false'}
      data-ring-count={n}
    >
      <svg
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        className="block overflow-visible"
        aria-hidden
        data-testid={`${testId}-svg`}
      >
        {drawArcs &&
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
                  data-ring={ring.key}
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
          {label}
        </text>
      </svg>
    </span>
  );
}
