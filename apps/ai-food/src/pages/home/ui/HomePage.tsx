import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddFoodSheet } from '@/features/add-food';
import { useDiaryStore } from '@/entities/meal';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';
import { getWeekDays, isSameDay } from '@/shared/lib';

export function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const [isAddOpen, setIsAddOpen] = useState(false);

  function handleWeekChange(delta: 1 | -1) {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    const newWeekDays = getWeekDays(newOffset);
    const stillInWeek = newWeekDays.some((d) => isSameDay(d, selectedDate));
    if (!stillInWeek) setSelectedDate(newWeekDays[0]);
  }

  return (
    <div className="relative flex h-svh min-h-0 flex-col overflow-hidden bg-zinc-50">
      <DailyHeader
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onDaySelect={setSelectedDate}
        onWeekChange={handleWeekChange}
      />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24">
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
      <AddFoodSheet open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
