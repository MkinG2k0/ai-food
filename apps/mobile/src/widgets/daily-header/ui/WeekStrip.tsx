import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay, formatDayLabel } from '@/shared/lib';

interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

export function WeekStrip({
  weekOffset,
  selectedDate,
  meals,
  onDaySelect,
  onWeekChange,
}: WeekStripProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  function hasMeals(date: Date): boolean {
    return meals.some((m) => isSameDay(new Date(m.timestamp), date));
  }

  function recenter() {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;
    x.set(-slotWidth);
  }

  useLayoutEffect(() => {
    recenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    window.addEventListener('resize', recenter);
    return () => window.removeEventListener('resize', recenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const slotWidth = viewportRef.current?.getBoundingClientRect().width ?? 0;
    if (!slotWidth) return;

    if (info.offset.x < -SWIPE_OFFSET_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      animate(x, -2 * slotWidth, { type: 'tween', duration: 0.2, ease: 'easeOut' }).then(() => {
        onWeekChange(1);
      });
    } else if (info.offset.x > SWIPE_OFFSET_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      animate(x, 0, { type: 'tween', duration: 0.2, ease: 'easeOut' }).then(() => {
        onWeekChange(-1);
      });
    } else {
      animate(x, -slotWidth, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  const weekOffsets = [weekOffset - 1, weekOffset, weekOffset + 1];

  return (
    <div
      ref={viewportRef}
      data-testid="week-strip-viewport"
      className="overflow-hidden touch-pan-y overscroll-x-contain mt-4"
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
                const hasFood = hasMeals(date);
                const label = formatDayLabel(date);
                const dayNum = date.getDate();

                return (
                  <button
                    key={date.toDateString()}
                    onClick={() => onDaySelect(date)}
                    className="flex flex-col items-center gap-1 min-w-[36px]"
                  >
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-white' : 'text-emerald-100'
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'bg-white text-emerald-600'
                          : 'text-white hover:bg-emerald-400'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <span
                      className={`w-1 h-1 rounded-full transition-colors ${
                        hasFood
                          ? isSelected
                            ? 'bg-emerald-400'
                            : 'bg-emerald-200'
                          : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
