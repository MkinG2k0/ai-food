import { motion, useAnimation } from 'framer-motion';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay, formatDayLabel } from '@/shared/lib';

interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

export function WeekStrip({
  weekOffset,
  selectedDate,
  meals,
  onDaySelect,
  onWeekChange,
}: WeekStripProps) {
  const days = getWeekDays(weekOffset);
  const controls = useAnimation();

  function hasMeals(date: Date): boolean {
    return meals.some((m) => isSameDay(new Date(m.timestamp), date));
  }

  async function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) {
    const { offset, velocity } = info;
    if (offset.x < -80 || velocity.x < -500) {
      await controls.start({ x: -40, opacity: 0, transition: { duration: 0.15 } });
      onWeekChange(1);
      controls.set({ x: 40, opacity: 0 });
      controls.start({ x: 0, opacity: 1, transition: { duration: 0.15 } });
    } else if (offset.x > 80 || velocity.x > 500) {
      await controls.start({ x: 40, opacity: 0, transition: { duration: 0.15 } });
      onWeekChange(-1);
      controls.set({ x: -40, opacity: 0 });
      controls.start({ x: 0, opacity: 1, transition: { duration: 0.15 } });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      animate={controls}
      onDragEnd={handleDragEnd}
      className="flex justify-between mt-4 cursor-grab active:cursor-grabbing select-none"
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
    </motion.div>
  );
}
