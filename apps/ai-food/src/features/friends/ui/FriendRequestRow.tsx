import { Button } from '@/shared/ui';
import type { FriendRequestItem } from '../api/friendsApi';

type FriendRequestRowProps = {
  request: FriendRequestItem;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  busy?: boolean;
};

export function FriendRequestRow({
  request,
  onAccept,
  onDecline,
  busy = false,
}: FriendRequestRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-background px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{request.displayName}</p>
        {request.username ? (
          <p className="truncate text-xs text-muted-foreground">@{request.username}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onAccept(request.requestId)}
        >
          Принять
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onDecline(request.requestId)}
        >
          Отклонить
        </Button>
      </div>
    </div>
  );
}
