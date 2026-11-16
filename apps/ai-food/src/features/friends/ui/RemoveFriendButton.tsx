import { Button } from '@/shared/ui';
import { useRemoveFriend } from '../model/useRemoveFriend';
import type { RemoveFriendButtonProps } from './RemoveFriendButton.types';

export function RemoveFriendButton({
  userId,
  className,
}: RemoveFriendButtonProps) {
  const { handleRemoveFriend, isPending } = useRemoveFriend(userId);

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={isPending}
      onClick={() => {
        void handleRemoveFriend();
      }}
    >
      {isPending ? 'Удаление…' : 'Удалить из друзей'}
    </Button>
  );
}
