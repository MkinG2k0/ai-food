import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FavoritesList } from '@/features/favorites';
import { Button } from '@/shared/ui';

export function FavoritesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-2 px-4 py-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Избранное</h1>
      </header>

      <main className="flex-1 px-4 py-4">
        <FavoritesList onSelect={() => navigate('/')} />
      </main>
    </div>
  );
}
