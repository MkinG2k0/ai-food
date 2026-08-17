import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import {
  FriendListRow,
  FriendRequestRow,
  friendsErrorMessage,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useFriendRequests,
  useFriendsList,
  useRequestFriendMutation,
} from '@/features/friends';
import { Button, SubpageShell } from '@/shared/ui';

export function FriendsPage() {
  const navigate = useNavigate();
  const userToken = useAuthStore((s) => s.userToken);
  const [query, setQuery] = useState('');
  const loggedIn = Boolean(userToken);

  const { data: friends = [], isLoading: friendsLoading } =
    useFriendsList(loggedIn);
  const { data: requests, isLoading: requestsLoading } =
    useFriendRequests(loggedIn);
  const requestMutation = useRequestFriendMutation();
  const acceptMutation = useAcceptFriendRequestMutation();
  const declineMutation = useDeclineFriendRequestMutation();

  useEffect(() => {
    if (!userToken) {
      navigate('/login', { replace: true });
    }
  }, [userToken, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      await requestMutation.mutateAsync(trimmed);
      setQuery('');
      toast.success('Заявка отправлена');
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : undefined;
      toast.error(friendsErrorMessage(code) ?? 'Не удалось отправить заявку');
    }
  }

  async function handleAccept(requestId: string) {
    try {
      await acceptMutation.mutateAsync(requestId);
      toast.success('Заявка принята');
    } catch {
      toast.error('Не удалось принять заявку');
    }
  }

  async function handleDecline(requestId: string) {
    try {
      await declineMutation.mutateAsync(requestId);
      toast.success('Заявка отклонена');
    } catch {
      toast.error('Не удалось отклонить заявку');
    }
  }

  const mutationBusy =
    requestMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending;

  if (!loggedIn) {
    return null;
  }

  return (
    <SubpageShell title="Друзья" onBack={() => navigate('/')}>
      <form className="flex gap-2" onSubmit={(e) => void handleSubmit(e)}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="@username или Telegram ID"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={requestMutation.isPending}
        />
        <Button type="submit" disabled={requestMutation.isPending || !query.trim()}>
          Добавить
        </Button>
      </form>

      {requestsLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка заявок…</p>
      ) : (requests?.incoming.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Входящие заявки</h2>
          {requests!.incoming.map((request) => (
            <FriendRequestRow
              key={request.requestId}
              request={request}
              busy={mutationBusy}
              onAccept={(id) => void handleAccept(id)}
              onDecline={(id) => void handleDecline(id)}
            />
          ))}
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Друзья</h2>
        {friendsLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Пока нет друзей — отправьте заявку по @username или Telegram ID.
          </p>
        ) : (
          friends.map((friend) => (
            <FriendListRow
              key={friend.userId}
              friend={friend}
              onOpen={(userId) => navigate(`/friends/${userId}`)}
            />
          ))
        )}
      </section>
    </SubpageShell>
  );
}
