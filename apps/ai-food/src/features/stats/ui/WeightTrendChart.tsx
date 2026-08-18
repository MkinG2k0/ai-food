import { useId, useMemo, useRef, type PointerEvent } from 'react';
import type { WeightChartPoint } from '../model/weightProgress';

interface WeightTrendChartProps {
  points: WeightChartPoint[];
  goalKg?: number | null;
  idealPoints?: WeightChartPoint[];
  viewStart: Date;
  viewEnd: Date;
  onPanDays?: (deltaDays: number) => void;
  /** When false, hide swipe hint and disable pan (read-only friend profile). */
  interactive?: boolean;
}

const VB_W = 320;
const VB_H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
const PLAN_STROKE = 'hsl(215 20% 45%)';
const FACT_STROKE = 'hsl(160 84% 39%)';
/** Inclusive day span matching WEIGHT_VIEW_DAYS (30). */
const WEIGHT_VIEW_SPAN_DAYS = 30;

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

function buildPath(
  mapped: { x: number; y: number }[],
): string {
  if (mapped.length === 1) {
    return `M ${mapped[0].x} ${mapped[0].y}`;
  }
  if (mapped.length > 1) {
    return mapped
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }
  return '';
}

export function WeightTrendChart({
  points,
  goalKg,
  idealPoints = [],
  viewStart,
  viewEnd,
  onPanDays,
  interactive = true,
}: WeightTrendChartProps) {
  const gradId = useId();
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;
  const pointerRef = useRef<{
    id: number;
    x: number;
    y: number;
    locked: boolean | null;
    accDx: number;
  } | null>(null);

  const { min, max, ticks, pathD, areaD, mapped, idealMapped, idealPathD, goalY } =
    useMemo(() => {
      const values = [
        ...points.map((p) => p.kg),
        ...idealPoints.map((p) => p.kg),
        ...(goalKg != null ? [goalKg] : []),
      ];
      const domain = niceWeightDomain(values);
      const span = domain.max - domain.min || 1;
      const yTicks = [0, 0.33, 0.66, 1].map(
        (t) => Math.round((domain.min + span * t) * 10) / 10,
      );

      const t0 = viewStart.getTime();
      const t1 = viewEnd.getTime();
      const timeSpan = Math.max(1, t1 - t0);
      const xAtDate = (d: Date) =>
        PAD.left + ((d.getTime() - t0) / timeSpan) * plotW;
      const yAt = (kg: number) =>
        PAD.top + ((domain.max - kg) / span) * plotH;

      const mappedPts = points.map((p) => ({
        ...p,
        x: xAtDate(p.date),
        y: yAt(p.kg),
      }));
      const idealMappedPts = idealPoints.map((p) => ({
        ...p,
        x: xAtDate(p.date),
        y: yAt(p.kg),
      }));

      const path = buildPath(mappedPts);
      const idealPath = buildPath(idealMappedPts);
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
        idealMapped: idealMappedPts,
        idealPathD: idealPath,
        goalY: gY,
      };
    }, [points, idealPoints, goalKg, plotH, plotW, viewStart, viewEnd]);

  const xLabels = [viewStart, viewEnd].filter(
    (d, i, arr) =>
      i === 0 || d.getTime() !== arr[0].getTime(),
  );
  if (viewEnd.getTime() - viewStart.getTime() > 0) {
    const mid = new Date(
      (viewStart.getTime() + viewEnd.getTime()) / 2,
    );
    mid.setHours(0, 0, 0, 0);
    if (
      mid.getTime() !== viewStart.getTime() &&
      mid.getTime() !== viewEnd.getTime()
    ) {
      xLabels.splice(1, 0, mid);
    }
  }

  const hasSeries = points.length > 0 || idealPoints.length > 0;
  const subtitle = `${formatAxisDay(viewStart)} – ${formatAxisDay(viewEnd)}`;
  const canPan = interactive && Boolean(onPanDays);

  const daysPerPx = (WEIGHT_VIEW_SPAN_DAYS - 1) / plotW;

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!canPan) return;
    pointerRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      locked: null,
      accDx: 0,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const st = pointerRef.current;
    if (!st || st.id !== e.pointerId || !canPan) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (st.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      st.locked = Math.abs(dx) > Math.abs(dy);
      if (!st.locked) {
        pointerRef.current = null;
        return;
      }
    }
    if (!st.locked) return;
    e.preventDefault();
    st.accDx += dx;
    st.x = e.clientX;
    st.y = e.clientY;
    const dayDelta = -Math.round(st.accDx * daysPerPx);
    if (dayDelta !== 0) {
      onPanDays?.(dayDelta);
      st.accDx += dayDelta / daysPerPx;
    }
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (pointerRef.current?.id === e.pointerId) {
      pointerRef.current = null;
    }
  }

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
      aria-label="Динамика веса"
    >
      <header className="mb-3">
        <h2 className="text-base font-semibold tracking-tight">Динамика веса</h2>
        <p className="text-xs text-muted-foreground">
          {canPan ? `${subtitle} · свайп` : subtitle}
        </p>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className={`h-auto w-full ${canPan ? 'touch-pan-y' : ''}`}
          role="img"
          aria-label={`График веса, окно ${subtitle}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FACT_STROKE} stopOpacity="0.28" />
              <stop offset="100%" stopColor={FACT_STROKE} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect
            x={0}
            y={0}
            width={VB_W}
            height={VB_H}
            fill="transparent"
          />

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

            {idealPathD && (
              <path
                d={idealPathD}
                fill="none"
                stroke={PLAN_STROKE}
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {areaD && <path d={areaD} fill={`url(#${gradId})`} />}

            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={FACT_STROKE}
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
                fill={FACT_STROKE}
                stroke="white"
                strokeWidth={1.5}
              />
            ))}

            {xLabels.map((d) => {
              const t0 = viewStart.getTime();
              const t1 = viewEnd.getTime();
              const span = Math.max(1, t1 - t0);
              const x = PAD.left + ((d.getTime() - t0) / span) * plotW;
              return (
                <text
                  key={d.toISOString()}
                  x={x}
                  y={VB_H - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  {formatAxisDay(d)}
                </text>
              );
            })}
          </svg>

        {!hasSeries && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {canPan
              ? 'Нет записей за этот период'
              : 'Запишите вес — здесь появится тренд'}
          </p>
        )}
      </div>

      {(points.length > 0 || idealMapped.length > 0) && (
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          {points.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 rounded"
                style={{ backgroundColor: FACT_STROKE }}
              />
              Факт
            </span>
          )}
          {idealMapped.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-4 border-t-2 border-dashed"
                style={{ borderColor: PLAN_STROKE }}
              />
              План
            </span>
          )}
        </div>
      )}
    </section>
  );
}

