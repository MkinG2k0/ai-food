import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../lib/errors.js';

const mockVerifyUserToken = vi.fn();
const mockAssertGuest = vi.fn();
const mockEnsureDevice = vi.fn();
const mockGetPrisma = vi.fn();
const mockIsDb = vi.fn();
const mockShouldEnforce = vi.fn();
const mockHasActiveSubscription = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: (...args: unknown[]) => mockVerifyUserToken(...args),
}));

vi.mock('../lib/subscription.js', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

vi.mock('../lib/quota.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/quota.js')>(
    '../lib/quota.js',
  );
  return {
    ...actual,
    assertGuestQuotaOrThrow: (...args: unknown[]) => mockAssertGuest(...args),
    ensureDevice: (...args: unknown[]) => mockEnsureDevice(...args),
    shouldEnforceQuota: (...args: unknown[]) => mockShouldEnforce(...args),
  };
});

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) => mockIsDb(...args),
}));

import { enforceChatQuota } from './quota.js';

function run(
  headers: Record<string, string>,
): Promise<{ err?: unknown; req: { quota?: unknown } }> {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
    quota: undefined as unknown,
  } as unknown as Request;
  const res = {} as Response;
  return new Promise((resolve) => {
    const next: NextFunction = (err?: unknown) => {
      resolve({ err, req: req as unknown as { quota?: unknown } });
    };
    void enforceChatQuota(req, res, next);
  });
}

describe('enforceChatQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldEnforce.mockReturnValue(true);
    mockIsDb.mockReturnValue(true);
    mockGetPrisma.mockReturnValue({
      user: { findUnique: mockFindUnique },
    });
    mockHasActiveSubscription.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('skips non-billable kinds', async () => {
    const { err, req } = await run({ 'x-usage-kind': 'other' });
    expect(err).toBeUndefined();
    expect(req.quota).toMatchObject({ usageKind: 'other', shouldRecord: false });
    expect(mockAssertGuest).not.toHaveBeenCalled();
  });

  it('requires device id for guests on analyze', async () => {
    const { err } = await run({ 'x-usage-kind': 'analyze' });
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('DEVICE_ID_REQUIRED');
  });

  it('skips guest quota when auth user has active subscription', async () => {
    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', phone: '+79991234567' });
    mockFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
    });
    mockHasActiveSubscription.mockReturnValue(true);
    mockEnsureDevice.mockResolvedValue({ id: 'drow' });
    const { err, req } = await run({
      'x-usage-kind': 'refine',
      'x-user-token': 'jwt',
      'x-device-id': 'dev-1',
    });
    expect(err).toBeUndefined();
    expect(req.quota).toMatchObject({
      usageKind: 'refine',
      userId: 'u1',
      deviceRowId: 'drow',
      shouldRecord: true,
    });
    expect(mockAssertGuest).not.toHaveBeenCalled();
  });

  it('applies guest device quota when auth user has no subscription', async () => {
    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', phone: '+79991234567' });
    mockFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    mockHasActiveSubscription.mockReturnValue(false);
    mockAssertGuest.mockResolvedValue({
      deviceRowId: 'd1',
      used: 1,
      limit: 50,
    });
    const { err, req } = await run({
      'x-usage-kind': 'analyze',
      'x-user-token': 'jwt',
      'x-device-id': 'dev-1',
    });
    expect(err).toBeUndefined();
    expect(mockAssertGuest).toHaveBeenCalled();
    expect(req.quota).toMatchObject({
      usageKind: 'analyze',
      userId: 'u1',
      deviceRowId: 'd1',
      shouldRecord: true,
    });
  });

  it('checks guest quota when no user token', async () => {
    mockAssertGuest.mockResolvedValue({
      deviceRowId: 'd1',
      used: 1,
      limit: 50,
    });
    const { err, req } = await run({
      'x-usage-kind': 'analyze',
      'x-device-id': 'abc',
    });
    expect(err).toBeUndefined();
    expect(req.quota).toMatchObject({
      deviceRowId: 'd1',
      shouldRecord: true,
      usageKind: 'analyze',
    });
  });
});
