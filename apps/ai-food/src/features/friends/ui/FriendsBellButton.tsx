import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { useFriendRequests } from '../model/useFriendsQueries';

export function FriendsBellButton() {
  const navigate = useNavigate();
  const userToken = useAuthStore((s) => s.userToken);
  const { data } = useFriendRequests(Boolean(userToken));
  const pendingCount = data?.incoming.length ?? 0;

  if (!userToken) return null;

  return (
    <button
      type="button"
      className="relative p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      aria-label={
        pendingCount > 0
          ? `Друзья, ${pendingCount} новых заявок`
          : 'Друзья'
      }
      onClick={() => navigate('/friends')}
    >
      <Users className="h-5 w-5" />
      {pendingCount > 0 ? (
        <span
          className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
