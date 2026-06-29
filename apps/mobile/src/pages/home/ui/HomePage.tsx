import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DailyHeader />
      <main className="flex-1 px-4 py-4 pb-24">
        <MealList />
      </main>
      <div className="fixed bottom-6 right-6">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => navigate('/add')}
          aria-label="Add food"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
