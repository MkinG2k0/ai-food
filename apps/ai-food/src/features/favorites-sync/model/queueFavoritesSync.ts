import { syncFavorites } from './syncFavorites';

export function queueFavoritesSync(
  options: Parameters<typeof syncFavorites>[0],
): void {
  void syncFavorites(options).catch((err) => {
    console.warn('[favorites-sync]', err);
  });
}
