import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AddFoodSheet, type AddFoodAutoAction } from '@/features/add-food';
import { LatestNewsSheet } from '@/features/news';
import { useDiaryStore } from '@/entities/meal';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';
import { getWeekDays, isSameDay, weekOffsetForDate } from '@/shared/lib';

function parseHomeAddParam(
  value: string | null,
): AddFoodAutoAction | null {
  if (value === 'gallery' || value === 'describe') return value;
  return null;
}

export function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [autoAction, setAutoAction] = useState<AddFoodAutoAction | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const add = parseHomeAddParam(searchParams.get('add'));
    if (!add) return;

    setAutoAction(add);
    setIsAddOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function handleWeekChange(delta: 1 | -1) {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    const newWeekDays = getWeekDays(newOffset);
    const stillInWeek = newWeekDays.some((d) => isSameDay(d, selectedDate));
    if (!stillInWeek) setSelectedDate(newWeekDays[0]);
  }

  function handleDaySelect(date: Date) {
    setSelectedDate(date);
    setWeekOffset(weekOffsetForDate(date));
  }

  return (
    <div className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-zinc-50">
      <DailyHeader
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onDaySelect={handleDaySelect}
        onWeekChange={handleWeekChange}
      />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 pt-0">
        <MealList selectedDate={selectedDate} />
      </main>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end px-6 pb-safe-fab">
        <Button
          size="icon"
          className="pointer-events-auto h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsAddOpen(true)}
          aria-label="Добавить еду"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      <AddFoodSheet
        open={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setAutoAction(null);
        }}
        autoAction={autoAction}
        onAutoActionConsumed={() => setAutoAction(null)}
      />
      <LatestNewsSheet suppressed={isAddOpen} />
    </div>
  );
}
