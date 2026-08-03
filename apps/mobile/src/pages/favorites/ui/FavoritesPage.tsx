import { useNavigate } from 'react-router-dom';
import { FavoritesList } from '@/features/favorites';
import { SubpageShell } from '@/shared/ui';

export function FavoritesPage() {
  const navigate = useNavigate();

  return (
    <SubpageShell title="Избранное" onBack={() => navigate(-1)}>
      <FavoritesList onSelect={() => navigate('/')} />
    </SubpageShell>
  );
}
