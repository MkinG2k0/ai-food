import { Bell } from 'lucide-react';
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
      <Bell className="h-5 w-5" />
      {pendingCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      ) : null}
    </button>
  );
}
