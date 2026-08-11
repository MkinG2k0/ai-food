import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isFutureDay, isSameDay } from '@/shared/lib';
import { evaluateWeightPace } from '../model/evaluateWeightPace';
import { paceDayBackground, paceDayLabel } from '../model/paceDayTone';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

/** Monday-based index 0..6 */
function mondayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

interface PaceDeadlineCalendarProps {
  weight: number;
  targetWeight: number;
  value: string; // YYYY-MM-DD
  onChange: (ymd: string) => void;
  now?: Date;
}

export function PaceDeadlineCalendar({
  weight,
  targetWeight,
  value,
  onChange,
  now,
}: PaceDeadlineCalendarProps) {
  const selected = parseYmd(value);
  const [today] = useState(() => new Date());
  const referenceNow = now ?? today;
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(
      selected ??
        new Date(referenceNow.getFullYear(), referenceNow.getMonth() + 3, 1),
    ),
  );

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const lead = mondayIndex(first);
    // Always 6 weeks (42 cells) so month changes don't shift legend / «Далее».
    const total = 42;
    const out: Array<{
      date: Date;
      inMonth: boolean;
      selectable: boolean;
      ymd: string;
      bg: string | null;
      tone: 'ok' | 'hard' | 'impossible' | null;
    }> = [];

    for (let i = 0; i < total; i++) {
      const date = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth(),
        i - lead + 1,
        12,
        0,
        0,
        0,
      );
      const inMonth = date.getMonth() === viewMonth.getMonth();
      const selectable = isFutureDay(date);
      const ymd = toYmd(date);
      let bg: string | null = null;
      let tone: 'ok' | 'hard' | 'impossible' | null = null;
      if (selectable) {
        const pace = evaluateWeightPace({
          weight,
          targetWeight,
          targetWeightDate: ymd,
          now: referenceNow,
        });
        bg = paceDayBackground(pace.rawDeltaKcal);
        tone = paceDayLabel(pace.rawDeltaKcal);
      }
      out.push({ date, inMonth, selectable, ymd, bg, tone });
    }
    return out;
  }, [viewMonth, weight, targetWeight, referenceNow]);

  const title = `${MONTHS_RU[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;

  function shiftMonth(delta: -1 | 1) {
    setViewMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1, 12, 0, 0, 0),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tabular-nums">{title}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-0.5"
        role="grid"
        aria-label="Календарь цели"
      >
        {cells.map((cell) => {
          const isSelected = selected != null && isSameDay(cell.date, selected);
          const disabled = !cell.selectable;
          return (
            <button
              key={cell.ymd + String(cell.inMonth)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(cell.ymd)}
              aria-label={
                cell.tone
                  ? `${cell.date.getDate()}, темп: ${
                      cell.tone === 'ok'
                        ? 'спокойный'
                        : cell.tone === 'hard'
                          ? 'сложный'
                          : 'нереальный'
                    }`
                  : `${cell.date.getDate()}`
              }
              aria-pressed={isSelected}
              className={[
                'relative flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition-shadow',
                cell.inMonth ? 'opacity-100' : 'opacity-35',
                disabled
                  ? 'cursor-not-allowed text-muted-foreground/50'
                  : 'hover:ring-2 hover:ring-primary/40',
                isSelected ? 'ring-2 ring-primary font-semibold' : '',
              ].join(' ')}
              style={
                cell.bg && !disabled
                  ? { backgroundColor: cell.bg }
                  : undefined
              }
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <div
          className="h-1.5 w-full rounded-full"
          style={{
            background:
              'linear-gradient(90deg, hsl(130 72% 70%), hsl(65 72% 70%), hsl(0 72% 70%))',
          }}
          aria-hidden
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Спокойно</span>
          <span>Сложно</span>
          <span>Нереально</span>
        </div>
      </div>
    </div>
  );
}
