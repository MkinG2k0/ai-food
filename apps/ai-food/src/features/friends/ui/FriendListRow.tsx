import { ChevronRight, Flame } from 'lucide-react';
import type { FriendSummary } from '../api/friendsApi';

type FriendListRowProps = {
  friend: FriendSummary;
  onOpen: (userId: string) => void;
};

export function FriendListRow({ friend, onOpen }: FriendListRowProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      onClick={() => onOpen(friend.userId)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{friend.displayName}</p>
        {friend.username ? (
          <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1 text-sm font-medium tabular-nums">
        <Flame className="h-4 w-4 text-primary" aria-hidden />
        {friend.streak}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
