import { useNavigate } from 'react-router-dom';
import { BottomSheet, Button } from '@/shared/ui';
import {
  getLatestNewsRelease,
  shouldShowLatestNews,
} from '../model/changelog';
import { useNewsSeenHydrated } from '../model/useNewsSeenHydrated';
import { useNewsSeenStore } from '../model/useNewsSeenStore';
import { NewsReleaseCard } from './NewsReleaseCard';

export function LatestNewsSheet({ suppressed = false }: { suppressed?: boolean }) {
  const navigate = useNavigate();
  const hydrated = useNewsSeenHydrated();
  const lastSeenDate = useNewsSeenStore((s) => s.lastSeenDate);
  const dismissLatest = useNewsSeenStore((s) => s.dismissLatest);
  const latest = getLatestNewsRelease();

  const open =
    hydrated &&
    !suppressed &&
    shouldShowLatestNews(lastSeenDate, latest?.date);

  function dismiss() {
    if (latest) dismissLatest(latest.date);
  }

  if (!latest) return null;

  return (
    <BottomSheet open={open} onClose={dismiss}>
      <div className="flex max-h-[min(92dvh,56rem)] flex-col gap-4 px-1">
        <div>
          <p className="text-lg font-semibold tracking-tight">Что нового</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Коротко о последнем обновлении
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NewsReleaseCard release={latest} isLatest />
        </div>
        <div className="space-y-2">
          <Button className="w-full" onClick={dismiss}>
            Понятно
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              dismiss();
              navigate('/news');
            }}
          >
            Все новости
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
