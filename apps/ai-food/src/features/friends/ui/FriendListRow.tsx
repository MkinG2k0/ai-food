import { ArrowRight, ChevronRight, Flame, Weight } from 'lucide-react';
import type { FriendSummary } from '../api/friendsApi';

type FriendListRowProps = {
  friend: FriendSummary;
  onOpen: (userId: string) => void;
};

function formatKg(value: number | null | undefined): string {
  return value != null ? String(value) : '—';
}

export function FriendListRow({ friend, onOpen }: FriendListRowProps) {
  const weightLabel = formatKg(friend.weightKg);
  const goalLabel = formatKg(friend.goalKg);

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg border border-input bg-background px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      onClick={() => onOpen(friend.userId)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{friend.displayName}</p>
        {friend.username ? (
          <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 text-sm font-medium tabular-nums">
        <span
          className="flex items-center gap-1"
          aria-label={`Запись ${friend.streak}`}
        >
          <Flame className="h-4 w-4 text-primary" aria-hidden />
          {friend.streak}
        </span>
        <span
          className="flex items-center gap-1"
          aria-label={`Вес ${weightLabel} → ${goalLabel} кг`}
        >
          <Weight className="h-4 w-4 text-primary" aria-hidden />
          {weightLabel}
          <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden />
          {goalLabel}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
