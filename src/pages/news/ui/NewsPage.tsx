import { useNavigate } from 'react-router-dom';
import { NEWS_CHANGELOG, formatNewsDate } from '@/features/news';
import { SubpageShell } from '@/shared/ui';

export function NewsPage() {
  const navigate = useNavigate();

  return (
    <SubpageShell title="Новости" onBack={() => navigate('/settings')}>
      <div className="space-y-8">
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
      </div>
    </SubpageShell>
  );
}
