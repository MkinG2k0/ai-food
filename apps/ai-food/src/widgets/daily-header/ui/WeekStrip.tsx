import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyTargets, Meal } from '@ai-food/shared-types';
import type { CalendarRingsSelection } from '@/features/settings';
import {
  DEFAULT_CALENDAR_RINGS,
  enabledCalendarRings,
} from '@/features/settings';
import {
  computeDayKbju,
  getMonthGridDays,
  getWeekDays,
  isSameDay,
  isFutureDay,
  formatDayLabel,
} from '@/shared/lib';
import { DayCellRings, dayCellSizeForRingCount } from './DayCellRings';

type MonthCursor = { year: number; month: number };

interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];
  targets?: DailyTargets | null;
  calendarRings?: CalendarRingsSelection;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const VERTICAL_EXPAND_THRESHOLD = 48;
const AXIS_LOCK_PX = 12;
const MAX_HORIZONTAL_FOR_VERTICAL = 20;
const DRAG_CLICK_GUARD = 10;
const WEEKDAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

/** Lock the gesture to the first dominant axis so a later drift does not switch it. */
export function lockPanAxis(
  current: 'x' | 'y' | null,
  offsetX: number,
  offsetY: number,
  threshold = AXIS_LOCK_PX,
): 'x' | 'y' | null {
  if (current) return current;
  const ax = Math.abs(offsetX);
  const ay = Math.abs(offsetY);
  if (ax < threshold && ay < threshold) return null;
  return ax >= ay ? 'x' : 'y';
}

export function isVerticalCalendarGesture(
  offsetX: number,
  offsetY: number,
): boolean {
  const ax = Math.abs(offsetX);
  const ay = Math.abs(offsetY);
  if (ay < VERTICAL_EXPAND_THRESHOLD) return false;
  if (ax > MAX_HORIZONTAL_FOR_VERTICAL) return false;
  return ay >= ax * 2;
}

/** Coordinated crossfade: week and month swap without an empty gap. */
const EXPAND_TRANSITION = {
  height: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  opacity: { duration: 0.22, ease: 'easeOut' as const },
};
const COLLAPSE_TRANSITION = {
  height: { duration: 0.34, ease: [0.32, 0.72, 0, 1] as const },
  opacity: { duration: 0.2, ease: 'easeIn' as const },
};

function shiftMonthCursor(cursor: MonthCursor, delta: -1 | 1): MonthCursor {
  const next = new Date(cursor.year, cursor.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

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
  calendarRings = DEFAULT_CALENDAR_RINGS,
  onDaySelect,
  onWeekChange,
}: WeekStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const monthViewportRef = useRef<HTMLDivElement>(null);
  const panOffset = useRef({ x: 0, y: 0 });
  const monthDidDrag = useRef(false);
  const x = useMotionValue(0);
  const monthX = useMotionValue(0);
  const [expanded, setExpanded] = useState(false);
  const [monthCursor, setMonthCursor] = useState<MonthCursor>(() => ({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
  }));

  useEffect(() => {
    if (!expanded) {
      setMonthCursor({
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth(),
      });
    }
  }, [selectedDate, expanded]);

  function recenter() {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;
    x.set(-slotWidth);
  }

  function recenterMonth() {
    const slotWidth =
      monthViewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;
    monthX.set(-slotWidth);
  }

  useLayoutEffect(() => {
    if (!expanded) recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, expanded]);

  useLayoutEffect(() => {
    if (expanded) recenterMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor.year, monthCursor.month, expanded]);

  useEffect(() => {
    function onResize() {
      recenter();
      recenterMonth();
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function trackPan(info: PanInfo) {
    panOffset.current = { x: info.offset.x, y: info.offset.y };
  }

  function markMonthDrag(info: PanInfo) {
    trackPan(info);
    if (
      Math.abs(info.offset.x) > DRAG_CLICK_GUARD ||
      Math.abs(info.offset.y) > DRAG_CLICK_GUARD
    ) {
      monthDidDrag.current = true;
    }
  }

  function handleMonthClickCapture(event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) {
    if (!monthDidDrag.current) return;
    event.preventDefault();
    event.stopPropagation();
    monthDidDrag.current = false;
  }

  function applyVerticalToggle(offsetY: number) {
    if (offsetY > VERTICAL_EXPAND_THRESHOLD) setExpanded(true);
    else if (offsetY < -VERTICAL_EXPAND_THRESHOLD) setExpanded(false);
  }

  function handleVerticalDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const tracked = panOffset.current;
    const ox =
      Math.abs(tracked.x) >= Math.abs(info.offset.x) ? tracked.x : info.offset.x;
    const oy =
      Math.abs(tracked.y) >= Math.abs(info.offset.y) ? tracked.y : info.offset.y;
    if (!isVerticalCalendarGesture(ox, oy)) return;
    applyVerticalToggle(oy);
  }

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

  function handleMonthDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const slotWidth =
      monthViewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;

    if (
      info.offset.x < -SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(monthX, -2 * slotWidth, {
        type: 'tween',
        duration: 0.2,
        ease: 'easeOut',
      }).then(() => {
        setMonthCursor((c) => shiftMonthCursor(c, 1));
      });
    } else if (
      info.offset.x > SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD
    ) {
      animate(monthX, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' }).then(
        () => {
          setMonthCursor((c) => shiftMonthCursor(c, -1));
        },
      );
    } else {
      animate(monthX, -slotWidth, {
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });
    }
  }

  function handleMonthDaySelect(date: Date) {
    onDaySelect(date);
  }

  function shiftMonth(delta: -1 | 1) {
    setMonthCursor((c) => shiftMonthCursor(c, delta));
  }

  const weekOffsets = [weekOffset - 1, weekOffset, weekOffset + 1];
  const monthPanels: MonthCursor[] = [
    shiftMonthCursor(monthCursor, -1),
    monthCursor,
    shiftMonthCursor(monthCursor, 1),
  ];
  const ringCellSize = dayCellSizeForRingCount(
    enabledCalendarRings(calendarRings).length,
  );
  const monthLabel = new Date(
    monthCursor.year,
    monthCursor.month,
    1,
  ).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const transition = expanded ? EXPAND_TRANSITION : COLLAPSE_TRANSITION;

  return (
    <div
      className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card px-2 pb-1 pt-3 shadow-sm"
      data-testid="calendar-panel"
    >
      {/* Both views stay mounted and crossfade heights — no empty frame */}
      <motion.div
        initial={false}
        animate={
          expanded
            ? { height: 0, opacity: 0 }
            : { height: 'auto', opacity: 1 }
        }
        transition={transition}
        drag={!expanded ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragStart={() => {
          panOffset.current = { x: 0, y: 0 };
        }}
        onDrag={(_event, info) => trackPan(info)}
        onDragEnd={handleVerticalDragEnd}
        className="overflow-hidden bg-card"
        style={{ pointerEvents: expanded ? 'none' : 'auto' }}
        aria-hidden={expanded}
      >
        <div
          ref={viewportRef}
          data-testid="week-strip-viewport"
          className="overflow-x-hidden overflow-y-visible touch-pan-y overscroll-x-contain bg-card"
        >
          <motion.div
            drag={!expanded ? 'x' : false}
            style={{ x, width: '300%' }}
            dragConstraints={viewportRef}
            dragElastic={0.15}
            dragMomentum={false}
            onDrag={(_event, info) => trackPan(info)}
            onDragEnd={handleDragEnd}
            className="flex cursor-grab active:cursor-grabbing select-none"
          >
            {weekOffsets.map((offset, i) => {
              const days = getWeekDays(offset);

              return (
                <div
                  key={['prev', 'current', 'next'][i]}
                  className="grid grid-cols-7"
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
                        tabIndex={expanded ? -1 : 0}
                        onClick={() => onDaySelect(date)}
                        className="flex flex-col items-center gap-1.5 overflow-visible py-1"
                      >
                        <span
                          className={`text-[11px] font-medium leading-none ${
                            isFuture
                              ? 'text-muted-foreground/60'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {label}
                        </span>
                        <DayCellRings
                          dayNumber={date.getDate()}
                          rings={calendarRings}
                          progress={dayKbju.progress}
                          hasReadyMeals={dayKbju.hasReadyMeals}
                          selected={isSelected}
                          future={isFuture}
                          size={ringCellSize}
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

      <motion.div
        data-testid="month-calendar-grid"
        data-expanded={expanded ? 'true' : 'false'}
        initial={false}
        animate={
          expanded
            ? { height: 'auto', opacity: 1 }
            : { height: 0, opacity: 0 }
        }
        transition={transition}
        drag={expanded ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={() => {
          panOffset.current = { x: 0, y: 0 };
        }}
        onDrag={(_event, info) => trackPan(info)}
        onDragEnd={handleVerticalDragEnd}
        className="overflow-hidden bg-card"
        style={{ pointerEvents: expanded ? 'auto' : 'none' }}
        aria-hidden={!expanded}
      >
        <div className="bg-card px-1">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              tabIndex={expanded ? 0 : -1}
              aria-label="Предыдущий месяц"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p
              data-testid="month-calendar-label"
              className="text-sm font-medium capitalize"
            >
              {monthLabel}
            </p>
            <button
              type="button"
              tabIndex={expanded ? 0 : -1}
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
          <div
            ref={monthViewportRef}
            data-testid="month-strip-viewport"
            aria-label="Календарь, свайп для смены месяца"
            className="overflow-x-hidden overflow-y-visible touch-pan-y overscroll-x-contain"
          >
            <motion.div
              drag={expanded ? 'x' : false}
              style={{ x: monthX, width: '300%' }}
              dragConstraints={monthViewportRef}
              dragElastic={0.15}
              dragMomentum={false}
              onDragStart={() => {
                monthDidDrag.current = false;
              }}
              onDrag={(_event, info) => markMonthDrag(info)}
              onDragEnd={handleMonthDragEnd}
              onClickCapture={handleMonthClickCapture}
              className="flex cursor-grab select-none active:cursor-grabbing"
            >
              {monthPanels.map((panel, i) => {
                const isCurrent = i === 1;
                const monthDays = getMonthGridDays(panel.year, panel.month);
                return (
                  <div
                    key={['prev', 'current', 'next'][i]}
                    className="grid grid-cols-7 gap-y-1"
                    style={{ width: '33.3333%' }}
                    aria-hidden={!isCurrent}
                  >
                    {monthDays.map(({ date, inMonth }) => {
                      const isSelected = isSameDay(date, selectedDate);
                      const isFuture = isFutureDay(date);
                      const dayKbju = computeDayKbju(meals, targets, date);
                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          tabIndex={expanded && isCurrent ? 0 : -1}
                          data-testid={isCurrent ? 'month-day-cell' : undefined}
                          data-in-month={inMonth ? 'true' : 'false'}
                          onClick={() =>
                            isCurrent ? handleMonthDaySelect(date) : undefined
                          }
                          className={`flex flex-col items-center justify-center py-0.5 ${
                            inMonth ? '' : 'opacity-40'
                          } ${isCurrent ? '' : 'pointer-events-none'}`}
                        >
                          <DayCellRings
                            dayNumber={date.getDate()}
                            rings={calendarRings}
                            progress={dayKbju.progress}
                            hasReadyMeals={dayKbju.hasReadyMeals}
                            selected={isSelected}
                            future={isFuture}
                            size={ringCellSize}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <CalendarHandle
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
    </div>
  );
}
