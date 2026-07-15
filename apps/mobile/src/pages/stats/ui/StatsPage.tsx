import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDiaryStore } from '@/entities/meal';
import {
  WeeklyCaloriesChart,
  getWeeklyCalorieSeries,
} from '@/features/stats';
import { Button } from '@/shared/ui';

export function StatsPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);
  const series = getWeeklyCalorieSeries(meals);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Статистика</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground mb-6">
          Калории за последние 7 дней
        </p>
        <WeeklyCaloriesChart series={series} />
      </main>
    </div>
  );
}
