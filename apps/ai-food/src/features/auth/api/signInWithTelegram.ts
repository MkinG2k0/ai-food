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

const BMP_LETTER_OR_DIGIT = /^[A-Za-z0-9]$/;

function stripLoneSurrogates(value: string): string {
  if (typeof value.toWellFormed === 'function') {
    return value.toWellFormed();
  }
  return value.replace(/[\uD800-\uDFFF]/g, '');
}

function safeAvatarLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'T';
  }
  for (const char of trimmed) {
    const cp = char.codePointAt(0);
    if (cp === undefined || cp > 0xffff) {
      continue;
    }
    const upper = char.toUpperCase();
    if (BMP_LETTER_OR_DIGIT.test(upper)) {
      return upper;
    }
  }
  return 'T';
}

function placeholderAvatar(name: string): string {
  const letter = safeAvatarLetter(name);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<circle cx="32" cy="32" r="32" fill="#229ED9"/>` +
    `<text x="32" y="40" text-anchor="middle" font-size="28" fill="#fff" font-family="sans-serif">${letter}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(stripLoneSurrogates(svg));
}

function resolveUsername(user: TelegramGatewayUser): string {
  const trimmed = user.username?.trim();
  if (trimmed) {
    return trimmed;
  }
  return String(user.telegramId);
}

export function mapTelegramUserToSession(
  user: TelegramGatewayUser,
): TelegramSession {
  const username = resolveUsername(user);
  const name =
    user.name?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    username ||
    'Telegram User';
  return {
    id: user.id,
    name,
    username,
    photo_url: user.photoUrl || placeholderAvatar(name),
    telegramId: Number(user.telegramId) || undefined,
  };
}