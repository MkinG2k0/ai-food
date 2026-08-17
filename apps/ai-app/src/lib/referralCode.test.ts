import { describe, expect, it } from 'vitest';
import {
  desiredReferralNick,
  ensureUserReferralCode,
  fallbackReferralCode,
} from './referralCode.js';

type UserRow = {
  id: string;
  username?: string | null;
  referralCode?: string | null;
};

function mockPrisma(opts?: {
  promoCodes?: string[];
  users?: UserRow[];
}) {
  const users = new Map<string, UserRow>(
    (opts?.users ?? []).map((u) => [u.id, { ...u }]),
  );
  const promos = new Set(opts?.promoCodes ?? []);

  return {
    promoCode: {
      findUnique: async ({ where }: { where: { code: string } }) =>
        promos.has(where.code) ? { id: 'p', code: where.code } : null,
    },
    user: {
      findUnique: async ({
        where,
      }: {
        where: { id?: string; referralCode?: string };
      }) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.referralCode) {
          return (
            [...users.values()].find((u) => u.referralCode === where.referralCode) ??
            null
          );
        }
        return null;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { referralCode: string };
      }) => {
        const prev = users.get(where.id);
        if (!prev) throw new Error('user not found');
        const next = { ...prev, ...data };
        users.set(where.id, next);
        return next;
      },
    },
    users,
  };
}

describe('desiredReferralNick', () => {
  it('normalizes Alice and @Alice to alice', () => {
    expect(desiredReferralNick('Alice')).toBe('alice');
    expect(desiredReferralNick('@Alice')).toBe('alice');
  });

  it('returns null for missing or blank username', () => {
    expect(desiredReferralNick(null)).toBeNull();
    expect(desiredReferralNick(undefined)).toBeNull();
    expect(desiredReferralNick('')).toBeNull();
    expect(desiredReferralNick('   ')).toBeNull();
    expect(desiredReferralNick('@')).toBeNull();
  });
});

describe('fallbackReferralCode', () => {
  it('uses u + last 8 alphanumeric chars of id, lowercase', () => {
    expect(fallbackReferralCode('abc-DEF-12345678')).toBe('u12345678');
    expect(fallbackReferralCode('user-1')).toBe('uuser1');
  });
});

describe('ensureUserReferralCode', () => {
  it('writes nick when free', async () => {
    const prisma = mockPrisma({
      users: [{ id: 'u1', username: '@Alice', referralCode: null }],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('u1')!),
    ).resolves.toBe('alice');
    expect(prisma.users.get('u1')?.referralCode).toBe('alice');
  });

  it('writes fallback when username is missing', async () => {
    const prisma = mockPrisma({
      users: [{ id: 'abc-DEF-12345678', username: null, referralCode: null }],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('abc-DEF-12345678')!),
    ).resolves.toBe('u12345678');
    expect(prisma.users.get('abc-DEF-12345678')?.referralCode).toBe('u12345678');
  });

  it('writes fallback when nick matches an admin PromoCode', async () => {
    const prisma = mockPrisma({
      promoCodes: ['alice'],
      users: [{ id: 'abc-DEF-12345678', username: 'Alice', referralCode: null }],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('abc-DEF-12345678')!),
    ).resolves.toBe('u12345678');
  });

  it('writes fallback when nick belongs to another user', async () => {
    const prisma = mockPrisma({
      users: [
        { id: 'abc-DEF-12345678', username: 'Alice', referralCode: null },
        { id: 'other', username: 'x', referralCode: 'alice' },
      ],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('abc-DEF-12345678')!),
    ).resolves.toBe('u12345678');
  });

  it('retries fallback with a longer suffix when the short key is taken', async () => {
    const id = 'idabcdefghij123456';
    const prisma = mockPrisma({
      promoCodes: ['uij123456'],
      users: [{ id, username: null, referralCode: null }],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get(id)!),
    ).resolves.toBe('ughij123456');
  });

  it('switches stored fallback to nick when username appears and nick is free', async () => {
    const prisma = mockPrisma({
      users: [
        { id: 'u1', username: 'Alice', referralCode: 'u12345678' },
      ],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('u1')!),
    ).resolves.toBe('alice');
    expect(prisma.users.get('u1')?.referralCode).toBe('alice');
  });

  it('keeps fallback when later nick still collides', async () => {
    const prisma = mockPrisma({
      promoCodes: ['alice'],
      users: [
        { id: 'u1', username: 'Alice', referralCode: 'u12345678' },
      ],
    });
    await expect(
      ensureUserReferralCode(prisma as never, prisma.users.get('u1')!),
    ).resolves.toBe('u12345678');
  });
});
