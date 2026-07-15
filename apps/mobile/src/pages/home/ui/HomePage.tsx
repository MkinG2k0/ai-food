import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddFoodSheet } from '@/features/add-food';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';
import { getWeekDays, isSameDay } from '@/shared/lib';

export function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);

  function handleWeekChange(delta: 1 | -1) {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    const newWeekDays = getWeekDays(newOffset);
    const stillInWeek = newWeekDays.some((d) => isSameDay(d, selectedDate));
    if (!stillInWeek) setSelectedDate(newWeekDays[0]);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DailyHeader
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onDaySelect={setSelectedDate}
        onWeekChange={handleWeekChange}
      />
      <main className="flex-1 px-4 py-4 pb-24">
        <MealList selectedDate={selectedDate} />
      </main>
      <div className="fixed bottom-6 right-6">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
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
