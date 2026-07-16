import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import {
  WeeklyCaloriesChart,
  WeeklyMicronutrientsChart,
  WeightProgressCard,
} from '@/features/stats';
import { Button } from '@/shared/ui';

const FALLBACK_GOAL_KCAL = 2000;

export function StatsPage() {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);
  const profile = useProfileStore((s) => s.profile);
  const targets = useProfileStore((s) => s.targets);
  const [weekOffset, setWeekOffset] = useState(0);
  const goalKcal = targets?.kcal ?? FALLBACK_GOAL_KCAL;

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex items-center border-b border-border/70 bg-background/90 px-4 py-4 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-2 text-lg font-semibold tracking-tight">
          Статистика
        </h1>
      </header>

      <main className="flex-1 space-y-5 px-4 py-5 pb-10">
        {profile && (
          <WeightProgressCard
            profileWeight={profile.weight}
            profileGoal={profile.goal}
          />
        )}

        <WeeklyCaloriesChart
          meals={meals}
          weekOffset={weekOffset}
          onWeekChange={(delta) => setWeekOffset((o) => o + delta)}
          goalKcal={goalKcal}
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Свайп графика — соседняя неделя
        </p>

        <WeeklyMicronutrientsChart
          meals={meals}
          weekOffset={weekOffset}
          onWeekChange={(delta) => setWeekOffset((o) => o + delta)}
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Свайп витаминов — та же неделя, что у калорий
        </p>
      </main>
    </div>
  );
}
