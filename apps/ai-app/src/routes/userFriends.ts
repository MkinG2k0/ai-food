import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { assertAuthConfigured, verifyUserToken } from '../lib/jwt.js';
import { sendMessage } from '../lib/telegramBotApi.js';
import {
  assertFriendship,
  allowsDevSelfFriendRequest,
  buildFriendProfile,
  displayName,
  listAcceptedFriends,
  resolveFriendTarget,
  type FriendRequestItem,
} from '../lib/friends.js';

export const userFriendsRouter = Router();

const requestBodySchema = z.object({
  query: z.string().min(1).max(200),
});

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'DATABASE_URL is not configured.',
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Database client is not available.',
    );
  }
  return prisma;
}

async function requireUser(req: { header(name: string): string | undefined }) {
  assertAuthConfigured();
  const header = req.header('x-user-token')?.trim();
  if (!header) {
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
  }
  return verifyUserToken(header);
}

function toRequestItem(
  row: {
    id: string;
    createdAt: Date;
    fromUser: {
      id: string;
      firstName: string | null;
      username: string | null;
    };
    toUser: {
      id: string;
      firstName: string | null;
      username: string | null;
    };
  },
  perspective: 'incoming' | 'outgoing',
): FriendRequestItem {
  const user = perspective === 'incoming' ? row.fromUser : row.toUser;
  return {
    requestId: row.id,
    userId: user.id,
    displayName: displayName(user),
    username: user.username,
    createdAt: row.createdAt.toISOString(),
  };
}

userFriendsRouter.post(
  '/request',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const parsed = requestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid friend request body.');
    }

    const prisma = requireDb();
    const target = await resolveFriendTarget(prisma, parsed.data.query);
    if (!target) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    if (target.id === payload.sub && !allowsDevSelfFriendRequest()) {
      throw new ApiError(400, 'SELF_REQUEST', 'Cannot send a friend request to yourself.');
    }

    const isSelfRequest = target.id === payload.sub;
    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId: payload.sub, toUserId: target.id },
          { fromUserId: target.id, toUserId: payload.sub },
        ],
      },
    });

    if (existing?.status === 'accepted') {
      throw new ApiError(400, 'ALREADY_FRIENDS', 'Users are already friends.');
    }
    if (existing?.status === 'pending') {
      throw new ApiError(400, 'REQUEST_PENDING', 'Friend request is already pending.');
    }

    const requestRow = await prisma.friendRequest.create({
      data: {
        fromUserId: payload.sub,
        toUserId: target.id,
        status: 'pending',
      },
      include: {
        fromUser: {
          select: { firstName: true, username: true },
        },
      },
    });

    const senderName = displayName(requestRow.fromUser);
    if (!isSelfRequest) {
      void sendMessage(
        Number(target.telegramId),
        `${senderName} хочет добавить вас в друзья. Откройте AI Food → Друзья.`,
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[friends] Telegram sendMessage failed:', message);
      });
    }

    res.status(201).json({ requestId: requestRow.id, status: 'pending' });
  }),
);

userFriendsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const prisma = requireDb();
    const friends = await listAcceptedFriends(prisma, payload.sub);
    res.status(200).json({ friends });
  }),
);

userFriendsRouter.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const prisma = requireDb();
    const rows = await prisma.friendRequest.findMany({
      where: {
        status: 'pending',
        OR: [{ toUserId: payload.sub }, { fromUserId: payload.sub }],
      },
      include: {
        fromUser: {
          select: { id: true, firstName: true, username: true },
        },
        toUser: {
          select: { id: true, firstName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const incoming: FriendRequestItem[] = [];
    const outgoing: FriendRequestItem[] = [];
    for (const row of rows) {
      if (row.toUserId === payload.sub) {
        incoming.push(toRequestItem(row, 'incoming'));
      } else {
        outgoing.push(toRequestItem(row, 'outgoing'));
      }
    }

    res.status(200).json({ incoming, outgoing });
  }),
);

userFriendsRouter.post(
  '/requests/:id/accept',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const prisma = requireDb();
    const row = await prisma.friendRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!row || row.toUserId !== payload.sub || row.status !== 'pending') {
      throw new ApiError(404, 'NOT_FOUND', 'Friend request not found.');
    }

    await prisma.friendRequest.update({
      where: { id: row.id },
      data: { status: 'accepted' },
    });

    res.status(200).json({ status: 'accepted' });
  }),
);

userFriendsRouter.post(
  '/requests/:id/decline',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const prisma = requireDb();
    const row = await prisma.friendRequest.findUnique({
      where: { id: req.params.id },
    });
    if (!row || row.toUserId !== payload.sub || row.status !== 'pending') {
      throw new ApiError(404, 'NOT_FOUND', 'Friend request not found.');
    }

    await prisma.friendRequest.update({
      where: { id: row.id },
      data: { status: 'declined' },
    });

    res.status(200).json({ status: 'declined' });
  }),
);

userFriendsRouter.get(
  '/:userId/profile',
  asyncHandler(async (req, res) => {
    const payload = await requireUser(req);
    const prisma = requireDb();
    const friendUserId = req.params.userId;

    const isFriend = await assertFriendship(prisma, payload.sub, friendUserId);
    if (!isFriend) {
      throw new ApiError(403, 'FRIENDS_ONLY', 'Profile is available to friends only.');
    }

    const profile = await buildFriendProfile(prisma, friendUserId);
    if (!profile) {
      throw new ApiError(404, 'NOT_FOUND', 'User not found.');
    }

    res.status(200).json(profile);
  }),
);
