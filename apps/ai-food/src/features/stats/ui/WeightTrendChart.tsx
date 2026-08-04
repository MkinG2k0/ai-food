import { useId, useMemo } from 'react';
import type { WeightChartPoint } from '../model/weightProgress';

interface WeightTrendChartProps {
  points: WeightChartPoint[];
  goalKg?: number | null;
}

const VB_W = 320;
const VB_H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

function niceWeightDomain(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 50, max: 90 };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max(1, (rawMax - rawMin) * 0.2);
  let min = Math.floor(rawMin - pad);
  let max = Math.ceil(rawMax + pad);
  if (max - min < 4) {
    const mid = (min + max) / 2;
    min = Math.floor(mid - 2);
    max = Math.ceil(mid + 2);
  }
  return { min, max };
}

function formatAxisDay(date: Date): string {
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    .replace(/\./g, '')
    .trim();
}

export function WeightTrendChart({ points, goalKg }: WeightTrendChartProps) {
  const gradId = useId();
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;

  const { min, max, ticks, pathD, areaD, mapped, goalY } = useMemo(() => {
    const values = [
      ...points.map((p) => p.kg),
      ...(goalKg != null ? [goalKg] : []),
    ];
    const domain = niceWeightDomain(values);
    const span = domain.max - domain.min || 1;
    const yTicks = [0, 0.33, 0.66, 1].map(
      (t) => Math.round((domain.min + span * t) * 10) / 10,
    );

    const xAt = (i: number, n: number) =>
      PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yAt = (kg: number) =>
      PAD.top + ((domain.max - kg) / span) * plotH;

    const mappedPts = points.map((p, i) => ({
      ...p,
      x: xAt(i, points.length),
      y: yAt(p.kg),
    }));

    let path = '';
    if (mappedPts.length === 1) {
      path = `M ${mappedPts[0].x} ${mappedPts[0].y}`;
    } else if (mappedPts.length > 1) {
      path = mappedPts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
    }

    const area =
      mappedPts.length >= 2
        ? `${path} L ${mappedPts[mappedPts.length - 1].x.toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${mappedPts[0].x.toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`
        : '';

    const gY =
      goalKg != null
        ? yAt(Math.min(domain.max, Math.max(domain.min, goalKg)))
        : null;

    return {
      min: domain.min,
      max: domain.max,
      ticks: yTicks,
      pathD: path,
      areaD: area,
      mapped: mappedPts,
      goalY: gY,
    };
  }, [points, goalKg, plotH, plotW]);

  const xLabels =
    points.length === 0
      ? []
      : points.length === 1
        ? [points[0]]
        : [
            points[0],
            points[Math.floor((points.length - 1) / 2)],
            points[points.length - 1],
          ].filter(
            (p, i, arr) =>
              arr.findIndex((x) => x.date.getTime() === p.date.getTime()) === i,
          );

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
      aria-label="Динамика веса"
    >
      <header className="mb-3">
        <h2 className="text-base font-semibold tracking-tight">Динамика веса</h2>
        <p className="text-xs text-muted-foreground">Последние 30 дней</p>
      </header>

      {points.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Запишите вес — здесь появится тренд
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`График веса от ${points[0].kg} до ${points[points.length - 1].kg} кг`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y =
              PAD.top + ((max - tick) / (max - min || 1)) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={VB_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="hsl(240 5.9% 90%)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {goalY != null && (
            <line
              x1={PAD.left}
              x2={VB_W - PAD.right}
              y1={goalY}
              y2={goalY}
              stroke="hsl(240 10% 3.9% / 0.35)"
              strokeWidth={1.25}
              strokeDasharray="4 4"
            />
          )}

          {areaD && <path d={areaD} fill={`url(#${gradId})`} />}

          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="hsl(160 84% 39%)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {mapped.map((p) => (
            <circle
              key={p.date.toISOString()}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="hsl(160 84% 39%)"
              stroke="white"
              strokeWidth={1.5}
            />
          ))}

          {xLabels.map((p) => {
            const i = points.findIndex(
              (x) => x.date.getTime() === p.date.getTime(),
            );
            const x =
              PAD.left +
              (points.length <= 1
                ? plotW / 2
                : (i / (points.length - 1)) * plotW);
            return (
              <text
                key={p.date.toISOString()}
                x={x}
                y={VB_H - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {formatAxisDay(p.date)}
              </text>
            );
          })}
        </svg>
      )}
    </section>
  );
}
