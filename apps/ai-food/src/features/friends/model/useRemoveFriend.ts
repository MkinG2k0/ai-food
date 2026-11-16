import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { removeFriend } from '../api/friendsApi';
import {
  friendProfileQueryKey,
  friendsErrorMessage,
  friendsQueryKey,
} from './useFriendsQueries';

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: (_data, userId) => {
      void queryClient.invalidateQueries({ queryKey: friendsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: friendProfileQueryKey(userId),
      });
      toast.success('Удалено из друзей');
    },
    onError: (err: unknown) => {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : undefined;
      toast.error(friendsErrorMessage(code) ?? 'Не удалось удалить из друзей');
    },
  });
}

export function useRemoveFriend(userId: string | undefined) {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useRemoveFriendMutation();

  async function handleRemoveFriend(): Promise<void> {
    if (!userId) return;
    const confirmed = window.confirm('Удалить из друзей?');
    if (!confirmed) return;
    try {
      await mutateAsync(userId);
      navigate('/friends');
    } catch {
      // toast handled in mutation onError
    }
  }

  return { handleRemoveFriend, isPending };
}
