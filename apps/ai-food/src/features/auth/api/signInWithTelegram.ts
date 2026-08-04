import type { TelegramSession } from '../model/telegramSession';

type TelegramGatewayUser = {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  name?: string | null;
};

function placeholderAvatar(name: string): string {
  const letter = (name.trim()[0] || 'T').toUpperCase();
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
        `<circle cx="32" cy="32" r="32" fill="#229ED9"/>` +
        `<text x="32" y="40" text-anchor="middle" font-size="28" fill="#fff" font-family="sans-serif">${letter}</text>` +
        `</svg>`,
    )
  );
}

export function mapTelegramUserToSession(
  user: TelegramGatewayUser,
): TelegramSession {
  const name =
    user.name?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    'Telegram User';
  return {
    id: user.id,
    name,
    username: user.username ?? '',
    photo_url: user.photoUrl || placeholderAvatar(name),
    telegramId: Number(user.telegramId) || undefined,
  };
}
