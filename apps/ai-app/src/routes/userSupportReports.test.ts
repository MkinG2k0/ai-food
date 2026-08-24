import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const mockGetPrisma = vi.fn();
const mockIsDatabaseConfigured = vi.fn();
const mockVerifyUserToken = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) =>
    mockIsDatabaseConfigured(...args),
}));

vi.mock('../lib/jwt.js', () => ({
  assertAuthConfigured: vi.fn(),
  verifyUserToken: (...args: unknown[]) => mockVerifyUserToken(...args),
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
    mockGetPrisma.mockReturnValue({
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === 'user-1'
            ? { id: 'user-1', telegramId: '123' }
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

  it('POST /user/support-reports validates message', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/user/support-reports')
      .set('X-Device-Id', 'device-abc')
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });
});
