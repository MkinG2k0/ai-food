import { Badge } from '@/shared/ui';
import { formatNewsDate, type NewsRelease } from '../model/changelog';

export function NewsReleaseCard({
  release,
  isLatest = false,
}: {
  release: NewsRelease;
  isLatest?: boolean;
}) {
  return (
    <article
      className={
        isLatest
          ? 'overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm ring-1 ring-primary/10'
          : 'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm'
      }
    >
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl"
          aria-hidden
        >
          {release.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {formatNewsDate(release.date)}
            </p>
            {isLatest ? (
              <Badge className="px-2 py-0 text-[10px] uppercase tracking-wide">
                Новое
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {release.title}
          </h2>
        </div>
      </header>
      <ul className="divide-y divide-border/70 border-t border-border/70">
        {release.items.map((item) => (
          <li key={item.text} className="flex items-start gap-3 px-4 py-2.5">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-sm"
              aria-hidden
            >
              {item.emoji}
            </span>
            <p className="pt-0.5 text-sm leading-snug text-foreground">
              {item.text}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
