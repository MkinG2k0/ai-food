import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DEFAULT_AUTH_LOGIN_GENERATION_BONUS,
  DEFAULT_FREE_GENERATION_LIMIT,
  getAuthLoginBonus,
  getEffectiveLimit,
  getFreeLimit,
  getQuotaLimits,
  getUsageSnapshot,
  isBillableUsageKind,
  parseUsageKind,
  shouldEnforceQuota,
} from './quota.js';

describe('quota helpers', () => {
  const prevDb = process.env.DATABASE_URL;
  const prevEnforce = process.env.QUOTA_ENFORCE;

  afterEach(() => {
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    if (prevEnforce === undefined) delete process.env.QUOTA_ENFORCE;
    else process.env.QUOTA_ENFORCE = prevEnforce;
  });

  it('parseUsageKind: empty → analyze; typed; unknown → other', () => {
    expect(parseUsageKind(undefined)).toBe('analyze');
    expect(parseUsageKind('')).toBe('analyze');
    expect(parseUsageKind('analyze_photo')).toBe('analyze_photo');
    expect(parseUsageKind('analyze_text')).toBe('analyze_text');
    expect(parseUsageKind('analyze_photo_text')).toBe('analyze_photo_text');
    expect(parseUsageKind('refine')).toBe('refine');
    expect(parseUsageKind('analyze')).toBe('analyze');
    expect(parseUsageKind('manual')).toBe('other');
    expect(parseUsageKind('nope')).toBe('other');
  });

  it('isBillableUsageKind treats analyze* and refine', () => {
    expect(isBillableUsageKind('analyze_photo')).toBe(true);
    expect(isBillableUsageKind('manual')).toBe(false);
  });

  it('getQuotaLimits uses defaults when settings missing', async () => {
    const prisma = {
      appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never;
    await expect(getFreeLimit(prisma)).resolves.toBe(
      DEFAULT_FREE_GENERATION_LIMIT,
    );
    await expect(getAuthLoginBonus(prisma)).resolves.toBe(
      DEFAULT_AUTH_LOGIN_GENERATION_BONUS,
    );
    await expect(getEffectiveLimit(false, prisma)).resolves.toBe(50);
    await expect(getEffectiveLimit(true, prisma)).resolves.toBe(150);
  });

  it('getQuotaLimits reads AppSettings overrides', async () => {
    const prisma = {
      appSettings: {
        findUnique: vi.fn().mockResolvedValue({
          freeGenerationLimit: 25,
          authLoginGenerationBonus: 75,
        }),
      },
    } as never;
    const limits = await getQuotaLimits(prisma);
    expect(limits).toEqual({
      freeGenerationLimit: 25,
      authLoginGenerationBonus: 75,
      freeSource: 'db',
      bonusSource: 'db',
    });
    await expect(getEffectiveLimit(true, prisma)).resolves.toBe(100);
  });

  it('shouldEnforceQuota follows DATABASE_URL and QUOTA_ENFORCE', () => {
    delete process.env.QUOTA_ENFORCE;
    delete process.env.DATABASE_URL;
    expect(shouldEnforceQuota()).toBe(false);
    process.env.DATABASE_URL = 'postgresql://x';
    expect(shouldEnforceQuota()).toBe(true);
    process.env.QUOTA_ENFORCE = 'false';
    expect(shouldEnforceQuota()).toBe(false);
    process.env.QUOTA_ENFORCE = 'true';
    delete process.env.DATABASE_URL;
    expect(shouldEnforceQuota()).toBe(true);
  });

  it('getUsageSnapshot: auth with subscription → remaining null', async () => {
    const prisma = {
      appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      device: { findUnique: vi.fn() },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: true,
      hasActiveSubscription: true,
    });
    expect(snap).toEqual({
      used: 0,
      limit: 150,
      remaining: null,
      authenticated: true,
      hasActiveSubscription: true,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });
  });

  it('getUsageSnapshot: auth without subscription → free + login bonus (by userId)', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      device: {
        upsert: vi.fn().mockResolvedValue({ id: 'drow' }),
      },
      usageEvent: {
        count: vi.fn().mockResolvedValue(10),
        updateMany,
      },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: true,
      hasActiveSubscription: false,
      userId: 'user-1',
    });
    expect(snap).toEqual({
      used: 10,
      limit: 150,
      remaining: 140,
      authenticated: true,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });
    expect(prisma.usageEvent.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [{ kind: 'refine' }, { kind: { startsWith: 'analyze' } }],
      },
    });
  });

  it('getUsageSnapshot: auth user shares quota across devices', async () => {
    const prisma = {
      appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      device: {
        upsert: vi.fn().mockResolvedValue({ id: 'drow-b' }),
      },
      usageEvent: {
        count: vi.fn().mockResolvedValue(150),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-other', {
      authenticated: true,
      hasActiveSubscription: false,
      userId: 'user-1',
    });
    expect(snap.used).toBe(150);
    expect(snap.remaining).toBe(0);
    expect(prisma.usageEvent.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('getUsageSnapshot: guest → free limit only', async () => {
    const prisma = {
      appSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      device: {
        findUnique: vi.fn().mockResolvedValue({ id: 'drow' }),
      },
      usageEvent: {
        count: vi.fn().mockResolvedValue(10),
      },
    } as never;
    const snap = await getUsageSnapshot(prisma, 'dev-1', {
      authenticated: false,
      hasActiveSubscription: false,
    });
    expect(snap).toEqual({
      used: 10,
      limit: 50,
      remaining: 40,
      authenticated: false,
      hasActiveSubscription: false,
      freeGenerationLimit: 50,
      authLoginGenerationBonus: 100,
    });
    expect(prisma.usageEvent.count).toHaveBeenCalledWith({
      where: {
        deviceId: 'drow',
        OR: [{ kind: 'refine' }, { kind: { startsWith: 'analyze' } }],
      },
    });
  });
});
