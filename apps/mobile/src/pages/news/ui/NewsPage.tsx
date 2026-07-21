import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NEWS_CHANGELOG, formatNewsDate } from '@/features/news';
import { Button } from '@/shared/ui';

export function NewsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Новости</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8">
        {NEWS_CHANGELOG.map((release) => (
          <section key={release.date} className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {formatNewsDate(release.date)}
            </p>
            <h2 className="text-base font-semibold text-foreground">
              {release.title}
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
              {release.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
