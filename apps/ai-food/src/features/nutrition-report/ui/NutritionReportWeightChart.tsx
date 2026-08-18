import { useMemo } from 'react';
import type { ReportWeightPoint } from '../model/buildReportData';

interface NutritionReportWeightChartProps {
  points: ReportWeightPoint[];
  idealPoints?: ReportWeightPoint[];
  goalKg?: number | null;
  viewStart: string;
  viewEnd: string;
}

const VB_W = 320;
const VB_H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
const PLAN_STROKE = '#5c6b7a';
const FACT_STROKE = '#12a574';
const GRID = '#e5e5e5';
const AXIS = '#737373';

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

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

function buildPath(mapped: { x: number; y: number }[]): string {
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

export function NutritionReportWeightChart({
  points,
  idealPoints = [],
  goalKg,
  viewStart,
  viewEnd,
}: NutritionReportWeightChartProps) {
  const gradId = 'report-weight-fact-fill';
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;

  const { min, max, ticks, pathD, areaD, mapped, idealMapped, idealPathD, goalY, startDate, endDate } =
    useMemo(() => {
      const start = parseYmd(viewStart);
      const end = parseYmd(viewEnd);
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

      const t0 = start.getTime();
      const t1 = end.getTime();
      const timeSpan = Math.max(1, t1 - t0);
      const xAtDate = (d: Date) =>
        PAD.left + ((d.getTime() - t0) / timeSpan) * plotW;
      const yAt = (kg: number) =>
        PAD.top + ((domain.max - kg) / span) * plotH;

      const mappedPts = points.map((p) => {
        const date = parseYmd(p.date);
        return { date, kg: p.kg, x: xAtDate(date), y: yAt(p.kg) };
      });
      const idealMappedPts = idealPoints.map((p) => {
        const date = parseYmd(p.date);
        return { date, kg: p.kg, x: xAtDate(date), y: yAt(p.kg) };
      });

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
        startDate: start,
        endDate: end,
      };
    }, [points, idealPoints, goalKg, plotH, plotW, viewStart, viewEnd]);

  const xLabels = [startDate, endDate].filter(
    (d, i, arr) => i === 0 || d.getTime() !== arr[0].getTime(),
  );
  if (points.length > 0 && endDate.getTime() - startDate.getTime() > 0) {
    const mid = new Date((startDate.getTime() + endDate.getTime()) / 2);
    mid.setHours(0, 0, 0, 0);
    if (
      mid.getTime() !== startDate.getTime() &&
      mid.getTime() !== endDate.getTime()
    ) {
      xLabels.splice(1, 0, mid);
    }
  }

  const showChart = points.length > 0 || idealPoints.length > 0;
  if (!showChart) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500">Нет записей</p>
    );
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="График веса за период отчёта"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FACT_STROKE} stopOpacity="0.28" />
            <stop offset="100%" stopColor={FACT_STROKE} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = PAD.top + ((max - tick) / (max - min || 1)) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={VB_W - PAD.right}
                y1={y}
                y2={y}
                stroke={GRID}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fill={AXIS}
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
            stroke="rgba(23, 23, 23, 0.35)"
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
          const t0 = startDate.getTime();
          const t1 = endDate.getTime();
          const span = Math.max(1, t1 - t0);
          const x = PAD.left + ((d.getTime() - t0) / span) * plotW;
          return (
            <text
              key={d.toISOString()}
              x={x}
              y={VB_H - 8}
              textAnchor="middle"
              fill={AXIS}
              fontSize={10}
            >
              {formatAxisDay(d)}
            </text>
          );
        })}
      </svg>

      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
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
    </>
  );
}
