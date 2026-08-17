import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  verifyUserToken: vi.fn(),
  assertAuthConfigured: vi.fn(),
  isDatabaseConfigured: vi.fn(),
  getPrisma: vi.fn(),
  sendMessage: vi.fn(),
  resolveFriendTarget: vi.fn(),
  listAcceptedFriends: vi.fn(),
  assertFriendship: vi.fn(),
  buildFriendProfile: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
  getPrisma: mocks.getPrisma,
}));
vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: mocks.verifyUserToken,
  assertAuthConfigured: mocks.assertAuthConfigured,
  signUserToken: vi.fn(),
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  sendMessage: mocks.sendMessage,
}));
vi.mock('../lib/friends.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/friends.js')>();
  return {
    ...actual,
    resolveFriendTarget: mocks.resolveFriendTarget,
    listAcceptedFriends: mocks.listAcceptedFriends,
    assertFriendship: mocks.assertFriendship,
    buildFriendProfile: mocks.buildFriendProfile,
  };
});

const { userFriendsRouter } = await import('./userFriends.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/user/friends', userFriendsRouter);
  app.use(errorHandler);
  return app;
}

const callerId = 'user-a';
const targetId = 'user-b';

describe('POST /user/friends/request', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      friendRequest: {
        findFirst: mocks.findFirst,
        create: mocks.create,
        findUnique: mocks.findUnique,
        update: mocks.update,
        findMany: mocks.findMany,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({ sub: callerId, telegramId: '1' });
    mocks.resolveFriendTarget.mockResolvedValue({
      id: targetId,
      username: 'bob',
      firstName: 'Bob',
      photoUrl: null,
      telegramId: '777',
    });
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: 'req-1',
      fromUser: { firstName: 'Alice', username: 'alice' },
    });
    mocks.sendMessage.mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  it('401 without token', async () => {
    const res = await request(createApp())
      .post('/user/friends/request')
      .send({ query: '@bob' });
    expect(res.status).toBe(401);
  });

  it('400 SELF_REQUEST', async () => {
    mocks.resolveFriendTarget.mockResolvedValue({
      id: callerId,
      username: 'alice',
      firstName: 'Alice',
      photoUrl: null,
      telegramId: '1',
    });
    const res = await request(createApp())
      .post('/user/friends/request')
      .set('x-user-token', 'jwt')
      .send({ query: '@alice' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_REQUEST');
  });

  it('400 ALREADY_FRIENDS', async () => {
    mocks.findFirst.mockResolvedValue({ status: 'accepted' });
    const res = await request(createApp())
      .post('/user/friends/request')
      .set('x-user-token', 'jwt')
      .send({ query: '@bob' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALREADY_FRIENDS');
  });

  it('400 REQUEST_PENDING', async () => {
    mocks.findFirst.mockResolvedValue({ status: 'pending' });
    const res = await request(createApp())
      .post('/user/friends/request')
      .set('x-user-token', 'jwt')
      .send({ query: '@bob' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REQUEST_PENDING');
  });

  it('201 creates pending request and sends Telegram DM', async () => {
    const res = await request(createApp())
      .post('/user/friends/request')
      .set('x-user-token', 'jwt')
      .send({ query: '@bob' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ requestId: 'req-1', status: 'pending' });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      777,
      expect.stringContaining('хочет добавить вас в друзья'),
    );
  });
});

describe('GET /user/friends', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({});
    mocks.verifyUserToken.mockResolvedValue({ sub: callerId, telegramId: '1' });
    mocks.listAcceptedFriends.mockResolvedValue([
      { userId: 'b', displayName: 'B', username: 'b', streak: 5 },
      { userId: 'c', displayName: 'C', username: 'c', streak: 10 },
    ]);
  });

  afterEach(() => vi.clearAllMocks());

  it('returns friends sorted by API helper', async () => {
    const res = await request(createApp())
      .get('/user/friends')
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(2);
  });
});

describe('GET /user/friends/requests', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      friendRequest: {
        findMany: mocks.findMany,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({ sub: callerId, telegramId: '1' });
    mocks.findMany.mockResolvedValue([
      {
        id: 'req-in',
        toUserId: callerId,
        fromUserId: targetId,
        createdAt: new Date('2026-08-18T10:00:00.000Z'),
        fromUser: { id: targetId, firstName: 'Bob', username: 'bob' },
        toUser: { id: callerId, firstName: 'Alice', username: 'alice' },
      },
      {
        id: 'req-out',
        toUserId: 'user-c',
        fromUserId: callerId,
        createdAt: new Date('2026-08-18T11:00:00.000Z'),
        fromUser: { id: callerId, firstName: 'Alice', username: 'alice' },
        toUser: { id: 'user-c', firstName: 'Carol', username: 'carol' },
      },
    ]);
  });

  afterEach(() => vi.clearAllMocks());

  it('splits incoming and outgoing pending requests', async () => {
    const res = await request(createApp())
      .get('/user/friends/requests')
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.incoming).toHaveLength(1);
    expect(res.body.outgoing).toHaveLength(1);
    expect(res.body.incoming[0].requestId).toBe('req-in');
    expect(res.body.outgoing[0].requestId).toBe('req-out');
  });
});

describe('POST /user/friends/requests/:id/accept', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({
      friendRequest: {
        findUnique: mocks.findUnique,
        update: mocks.update,
      },
    });
    mocks.verifyUserToken.mockResolvedValue({ sub: callerId, telegramId: '1' });
    mocks.findUnique.mockResolvedValue({
      id: 'req-1',
      toUserId: callerId,
      status: 'pending',
    });
    mocks.update.mockResolvedValue({ status: 'accepted' });
  });

  afterEach(() => vi.clearAllMocks());

  it('404 when caller is not recipient', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'req-1',
      toUserId: 'other',
      status: 'pending',
    });
    const res = await request(createApp())
      .post('/user/friends/requests/req-1/accept')
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(404);
  });

  it('accepts pending request for recipient', async () => {
    const res = await request(createApp())
      .post('/user/friends/requests/req-1/accept')
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });
});

describe('GET /user/friends/:userId/profile', () => {
  beforeEach(() => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getPrisma.mockReturnValue({});
    mocks.verifyUserToken.mockResolvedValue({ sub: callerId, telegramId: '1' });
    mocks.assertFriendship.mockResolvedValue(true);
    mocks.buildFriendProfile.mockResolvedValue({
      userId: targetId,
      displayName: 'Bob',
      streak: 3,
      goalKg: 70,
      weightKg: 75,
      targets: { kcal: 2000, protein: 150, fat: 70, carbs: 250 },
      sharePhotosToFriends: true,
      meals: [
        {
          id: 'meal-1',
          timestamp: '2026-08-18T08:00:00.000Z',
          name: 'Breakfast',
          totalCalories: 400,
          protein: 20,
          fat: 10,
          carbs: 40,
        },
      ],
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('403 when not friends', async () => {
    mocks.assertFriendship.mockResolvedValue(false);
    const res = await request(createApp())
      .get(`/user/friends/${targetId}/profile`)
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FRIENDS_ONLY');
  });

  it('returns profile without image fields', async () => {
    const res = await request(createApp())
      .get(`/user/friends/${targetId}/profile`)
      .set('x-user-token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.meals[0]).not.toHaveProperty('imageUri');
    expect(res.body.sharePhotosToFriends).toBe(true);
  });
});
