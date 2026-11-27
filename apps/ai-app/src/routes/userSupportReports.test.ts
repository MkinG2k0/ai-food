import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mockGetPrisma = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockVerifyUserToken = vi.fn();
const mockNotifyAdmin = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) =>
    mockIsDatabaseConfigured(...args),
}));

vi.mock('../lib/jwt.js', () => ({
  assertAuthConfigured: vi.fn(),
  verifyUserToken: (...args: unknown[]) => mockVerifyUserToken(...args),
}));

vi.mock('../lib/notifyAdminSupportReport.js', () => ({
  notifyAdminNewSupportReport: (...args: unknown[]) => mockNotifyAdmin(...args),
}));

import { createApp } from '../app.js';

type MockSupportReport = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  type: 'bug' | 'feature' | 'question' | 'other';
  message: string;
  images: string[] | null;
  appVersion: string | null;
  platform: string | null;
  clientSnapshot?: unknown;
  hasClientSnapshot?: boolean;
  status: 'new' | 'read' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
};

describe('user support reports', () => {
  let reports: MockSupportReport[];

  beforeEach(() => {
    reports = [];
    mockIsDatabaseConfigured.mockReturnValue(true);
    mockVerifyUserToken.mockResolvedValue({ sub: 'user-1' });
    mockNotifyAdmin.mockResolvedValue(undefined);
    mockGetPrisma.mockReturnValue({
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === 'user-1'
            ? {
                id: 'user-1',
                telegramId: '123',
                firstName: 'Кама',
                username: 'kama',
              }
            : null,
        ),
      },
      supportReport: {
        create: vi.fn(async ({ data }: { data: Omit<MockSupportReport, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: MockSupportReport['status'] } }) => {
          const row: MockSupportReport = {
            id: `report-${reports.length + 1}`,
            status: 'new',
            createdAt: new Date('2026-08-25T10:00:00.000Z'),
            updatedAt: new Date('2026-08-25T10:00:00.000Z'),
            userId: data.userId ?? null,
            deviceId: data.deviceId ?? null,
            type: data.type,
            message: data.message,
            images: (data.images as string[] | null) ?? null,
            appVersion: data.appVersion ?? null,
            platform: data.platform ?? null,
            clientSnapshot: data.clientSnapshot ?? null,
            hasClientSnapshot: data.hasClientSnapshot ?? false,
          };
          reports.push(row);
          return row;
        }),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST /user/support-reports requires auth headers', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .send({ message: 'test' });
    expect(res.status).toBe(401);
  });

  it('POST /user/support-reports creates report for logged-in user', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .set('X-User-Token', 'jwt')
      .send({
        type: 'bug',
        message: 'Не сохраняется приём',
        appVersion: '1.2.3',
        platform: 'android',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('report-1');
    expect(res.body.type).toBe('bug');
    expect(res.body.userId).toBe('user-1');
    expect(reports).toHaveLength(1);
    expect(mockNotifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'report-1',
        type: 'bug',
        message: 'Не сохраняется приём',
        userDisplayName: 'Кама',
        platform: 'android',
        appVersion: '1.2.3',
      }),
    );
  });

  it('POST /user/support-reports accepts guest device id', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .set('X-Device-Id', 'device-abc')
      .send({ message: 'Guest report' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeNull();
    expect(res.body.deviceId).toBe('device-abc');
  });

  it('POST /user/support-reports stores the client snapshot', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .set('X-Device-Id', 'device-abc')
      .send({
        message: 'Пропали фото',
        clientSnapshot: {
          version: 1,
          localStorage: { 'CapacitorStorage.ai-food-auth': '{"user":{"username":"kama"}}' },
          indexedDB: [{ name: 'Disc', version: 1, stores: [] }],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.hasClientSnapshot).toBe(true);
    expect(res.body.clientSnapshot.indexedDB[0].name).toBe('Disc');
    expect(reports[0]?.hasClientSnapshot).toBe(true);
  });

  it('POST /user/support-reports validates message', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .set('X-Device-Id', 'device-abc')
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });
});
