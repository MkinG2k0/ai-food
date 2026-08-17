import type { PrismaClient } from '../generated/prisma/client.js';
import { normalizePromoCode } from './promos.js';

const FALLBACK_SUFFIX_LENGTHS = [8, 10, 12, 16] as const;

export function desiredReferralNick(
  username: string | null | undefined,
): string | null {
  if (username == null) return null;
  const stripped = username.trim().replace(/^@+/, '');
  const nick = normalizePromoCode(stripped);
  return nick || null;
}

export function fallbackReferralCode(userId: string, suffixLen = 8): string {
  const alnum = userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `u${alnum.slice(-suffixLen)}`;
}

async function isCodeTaken(
  prisma: PrismaClient,
  code: string,
  exceptUserId?: string,
): Promise<boolean> {
  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (promo) return true;
  const owner = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!owner) return false;
  return owner.id !== exceptUserId;
}

async function allocateFallback(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  for (const len of FALLBACK_SUFFIX_LENGTHS) {
    const candidate = fallbackReferralCode(userId, len);
    if (!(await isCodeTaken(prisma, candidate, userId))) {
      return candidate;
    }
  }
  return fallbackReferralCode(userId, 16);
}

export async function ensureUserReferralCode(
  prisma: PrismaClient,
  user: {
    id: string;
    username?: string | null;
    referralCode?: string | null;
  },
): Promise<string> {
  const nick = desiredReferralNick(user.username);
  const current = user.referralCode ?? null;

  if (nick && !(await isCodeTaken(prisma, nick, user.id))) {
    if (current !== nick) {
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: nick },
      });
    }
    return nick;
  }

  if (current && current !== nick) {
    return current;
  }

  const fallback = await allocateFallback(prisma, user.id);
  if (current !== fallback) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: fallback },
    });
  }
  return fallback;
}
