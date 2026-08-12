import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyTargets, Meal } from '@ai-food/shared-types';
import type { CalendarRingMode } from '@/features/settings';
import {
  computeDayKbju,
  getMonthGridDays,
  getWeekDays,
  isSameDay,
  isFutureDay,
  formatDayLabel,
} from '@/shared/lib';
import { DayCellRings } from './DayCellRings';

interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];
  targets?: DailyTargets | null;
  calendarRingMode?: CalendarRingMode;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const VERTICAL_EXPAND_THRESHOLD = 48;
const WEEKDAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

function CalendarHandle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="calendar-expand-handle"
      aria-label="Календарь на месяц"
      aria-expanded={expanded}
      onClick={onToggle}
      className="mx-auto mt-2 flex h-6 w-12 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60"
    >
      <span className="grid grid-cols-3 gap-1" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-muted-foreground/50" />
        ))}
      </span>
    </button>
  );
}

export function WeekStrip({
  weekOffset,
  selectedDate,
  meals,
  targets = null,
  calendarRingMode = 'kcal_protein',
  onDaySelect,
  onWeekChange,
}: WeekStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [expanded, setExpanded] = useState(false);
  const [cursorYear, setCursorYear] = useState(selectedDate.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (!expanded) {
      setCursorYear(selectedDate.getFullYear());
      setCursorMonth(selectedDate.getMonth());
    }
  }, [selectedDate, expanded]);

  function recenter() {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;
    x.set(-slotWidth);
  }

  useLayoutEffect(() => {
    if (!expanded) recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, expanded]);

  useEffect(() => {
    window.addEventListener('resize', recenter);
    return () => window.removeEventListener('resize', recenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (expanded) return;
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;

    if (
      info.offset.x < -SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(x, -2 * slotWidth, {
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
      }).then(() => {
        onWeekChange(1);
      });
    } else if (
      info.offset.x > SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(x, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' }).then(
        () => {
          onWeekChange(-1);
        },
      );
    } else {
      animate(x, -slotWidth, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  function handleVerticalDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.y > VERTICAL_EXPAND_THRESHOLD || info.velocity.y > 400) {
      setExpanded(true);
    } else if (
      info.offset.y < -VERTICAL_EXPAND_THRESHOLD ||
      info.velocity.y < -400
    ) {
      setExpanded(false);
    }
  }

  function handleMonthDaySelect(date: Date) {
    onDaySelect(date);
    setExpanded(false);
  }

  function shiftMonth(delta: -1 | 1) {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
  }

  const weekOffsets = [weekOffset - 1, weekOffset, weekOffset + 1];
  const monthDays = getMonthGridDays(cursorYear, cursorMonth);
  const monthLabel = new Date(cursorYear, cursorMonth, 1).toLocaleDateString(
    'ru-RU',
    { month: 'long', year: 'numeric' },
  );

  return (
    <div className="mt-4">
      {expanded ? (
        <motion.div
          key="month"
          data-testid="month-calendar-grid"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleVerticalDragEnd}
          className="select-none overflow-hidden"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium capitalize">{monthLabel}</p>
            <button
              type="button"
              aria-label="Следующий месяц"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-y-1">
            {WEEKDAY_HEADERS.map((label) => (
              <span
                key={label}
                className="text-center text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {monthDays.map(({ date, inMonth }) => {
              const isSelected = isSameDay(date, selectedDate);
              const isFuture = isFutureDay(date);
              const dayKbju = computeDayKbju(meals, targets, date);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  data-testid="month-day-cell"
                  data-in-month={inMonth ? 'true' : 'false'}
                  onClick={() => handleMonthDaySelect(date)}
                  className={`flex flex-col items-center justify-center py-0.5 ${
                    inMonth ? '' : 'opacity-40'
                  }`}
                >
                  <DayCellRings
                    dayNumber={date.getDate()}
                    mode={calendarRingMode}
                    progress={dayKbju.progress}
                    hasReadyMeals={dayKbju.hasReadyMeals}
                    selected={isSelected}
                    future={isFuture}
                    size={40}
                  />
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="week"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={handleVerticalDragEnd}
        >
          <div
            ref={viewportRef}
            data-testid="week-strip-viewport"
            className="overflow-hidden touch-pan-y overscroll-x-contain"
          >
            <motion.div
              drag="x"
              style={{ x, width: '300%' }}
              dragConstraints={viewportRef}
              dragElastic={0.15}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              className="flex cursor-grab active:cursor-grabbing select-none"
            >
              {weekOffsets.map((offset, i) => {
                const days = getWeekDays(offset);

                return (
                  <div
                    key={['prev', 'current', 'next'][i]}
                    className="flex justify-between"
                    style={{ width: '33.3333%' }}
                  >
                    {days.map((date) => {
                      const isSelected = isSameDay(date, selectedDate);
                      const isFuture = isFutureDay(date);
                      const label = formatDayLabel(date);
                      const dayKbju = computeDayKbju(meals, targets, date);

                      return (
                        <button
                          key={date.toDateString()}
                          type="button"
                          onClick={() => onDaySelect(date)}
                          className="flex flex-col items-center gap-1 min-w-[36px]"
                        >
                          <span
                            className={`text-xs font-medium ${
                              isFuture
                                ? 'text-muted-foreground/60'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {label}
                          </span>
                          <DayCellRings
                            dayNumber={date.getDate()}
                            mode={calendarRingMode}
                            progress={dayKbju.progress}
                            hasReadyMeals={dayKbju.hasReadyMeals}
                            selected={isSelected}
                            future={isFuture}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      )}

      <CalendarHandle
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
    </div>
  );
}
