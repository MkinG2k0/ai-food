import type { PrismaClient } from '../generated/prisma/client.js';
import { settingsPayloadSchema } from './settingsSync.js';

export type FriendTarget = {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  telegramId: string;
};

export type FriendSummary = {
  userId: string;
  displayName: string;
  username: string | null;
  streak: number;
  photoUrl?: string;
};

export type FriendRequestItem = {
  requestId: string;
  userId: string;
  displayName: string;
  username: string | null;
  createdAt: string;
};

export type FriendProfileMeal = {
  id: string;
  timestamp: string;
  name: string | null;
  totalCalories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type FriendProfile = {
  userId: string;
  displayName: string;
  streak: number;
  goalKg: number | null;
  weightKg: number | null;
  weights: { date: string; kg: number }[];
  targets: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
  } | null;
  sharePhotosToFriends: boolean;
  meals: FriendProfileMeal[];
};

type MealItem = {
  protein?: number;
  fat?: number;
  carbs?: number;
};

export function displayName(user: {
  firstName: string | null;
  username: string | null;
}): string {
  const name = user.firstName?.trim();
  if (name) return name;
  const nick = user.username?.trim();
  if (nick) return `@${nick.replace(/^@/, '')}`;
  return 'Пользователь';
}

export function parseStreakLength(clientStreak: unknown): number {
  if (typeof clientStreak !== 'object' || clientStreak === null) return 0;
  const length = (clientStreak as { currentLength?: unknown }).currentLength;
  return typeof length === 'number' && Number.isFinite(length)
    ? Math.max(0, Math.floor(length))
    : 0;
}

export function parseSharePhotosToFriends(clientSettings: unknown): boolean {
  const parsed = settingsPayloadSchema.safeParse(clientSettings ?? {});
  if (parsed.success) return parsed.data.sharePhotosToFriends;
  if (
    typeof clientSettings === 'object' &&
    clientSettings !== null &&
    'sharePhotosToFriends' in clientSettings
  ) {
    return Boolean(
      (clientSettings as { sharePhotosToFriends?: unknown }).sharePhotosToFriends,
    );
  }
  return true;
}

export function sumMealMacros(items: unknown): {
  protein: number;
  fat: number;
  carbs: number;
} {
  if (!Array.isArray(items)) {
    return { protein: 0, fat: 0, carbs: 0 };
  }
  return items.reduce(
    (acc, raw) => {
      const item = raw as MealItem;
      return {
        protein: acc.protein + (item.protein ?? 0),
        fat: acc.fat + (item.fat ?? 0),
        carbs: acc.carbs + (item.carbs ?? 0),
      };
    },
    { protein: 0, fat: 0, carbs: 0 },
  );
}

export function sortFriendsByStreakDesc(
  friends: FriendSummary[],
): FriendSummary[] {
  return [...friends].sort((a, b) => b.streak - a.streak);
}

/** Local dev / demo: allow self friend-request to test the flow solo. */
export function allowsDevSelfFriendRequest(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function resolveFriendTarget(
  prisma: PrismaClient,
  rawQuery: string,
): Promise<FriendTarget | null> {
  let query = rawQuery.trim();
  if (!query) return null;
  if (query.startsWith('@')) {
    query = query.slice(1).trim();
  }
  if (!query) return null;

  const select = {
    id: true,
    username: true,
    firstName: true,
    photoUrl: true,
    telegramId: true,
  } as const;

  if (/^\d+$/.test(query)) {
    return prisma.user.findUnique({
      where: { telegramId: query },
      select,
    });
  }

  return prisma.user.findFirst({
    where: {
      username: { equals: query, mode: 'insensitive' },
    },
    select,
  });
}

export async function assertFriendship(
  prisma: PrismaClient,
  userA: string,
  userB: string,
): Promise<boolean> {
  const row = await prisma.friendRequest.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { fromUserId: userA, toUserId: userB },
        { fromUserId: userB, toUserId: userA },
      ],
    },
    select: { id: true },
  });
  return row !== null;
}

function parseNutritionTargets(
  nutritionProfile: unknown,
): FriendProfile['targets'] {
  if (typeof nutritionProfile !== 'object' || nutritionProfile === null) {
    return null;
  }
  const targets = (nutritionProfile as { targets?: unknown }).targets;
  if (typeof targets !== 'object' || targets === null) return null;
  const t = targets as Record<string, unknown>;
  const kcal = t.kcal;
  const protein = t.protein;
  const fat = t.fat;
  const carbs = t.carbs;
  if (
    typeof kcal !== 'number' ||
    typeof protein !== 'number' ||
    typeof fat !== 'number' ||
    typeof carbs !== 'number'
  ) {
    return null;
  }
  const fiber = t.fiber;
  return {
    kcal,
    protein,
    fat,
    carbs,
    ...(typeof fiber === 'number' ? { fiber } : {}),
  };
}

export function uniqueWeightsByDate(
  rows: { date: string; kg: number }[],
): { date: string; kg: number }[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, row.kg);
  }
  return [...byDate.entries()].map(([date, kg]) => ({ date, kg }));
}

function ymdDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function buildFriendProfile(
  prisma: PrismaClient,
  friendUserId: string,
): Promise<FriendProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: friendUserId },
    select: {
      id: true,
      firstName: true,
      username: true,
      clientStreak: true,
      goalKg: true,
      nutritionProfile: true,
      clientSettings: true,
    },
  });
  if (!user) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  since.setUTCHours(0, 0, 0, 0);

  const [meals, latestWeight, weightRows] = await Promise.all([
    prisma.meal.findMany({
      where: {
        userId: friendUserId,
        deletedAt: null,
        status: 'ready',
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        name: true,
        items: true,
        totalCalories: true,
      },
    }),
    prisma.weightEntry.findFirst({
      where: { userId: friendUserId, deletedAt: null },
      orderBy: [{ date: 'desc' }, { clientUpdatedAt: 'desc' }],
      select: { kg: true },
    }),
    prisma.weightEntry.findMany({
      where: {
        userId: friendUserId,
        deletedAt: null,
        date: { gte: ymdDaysAgo(90) },
      },
      orderBy: [{ date: 'asc' }, { clientUpdatedAt: 'asc' }],
      select: { date: true, kg: true },
    }),
  ]);

  return {
    userId: user.id,
    displayName: displayName(user),
    streak: parseStreakLength(user.clientStreak),
    goalKg: user.goalKg,
    weightKg: latestWeight?.kg ?? null,
    weights: uniqueWeightsByDate(weightRows),
    targets: parseNutritionTargets(user.nutritionProfile),
    sharePhotosToFriends: parseSharePhotosToFriends(user.clientSettings),
    meals: meals.map((meal) => {
      const macros = sumMealMacros(meal.items);
      return {
        id: meal.id,
        timestamp: meal.timestamp.toISOString(),
        name: meal.name,
        totalCalories: meal.totalCalories,
        protein: macros.protein,
        fat: macros.fat,
        carbs: macros.carbs,
      };
    }),
  };
}

export async function listAcceptedFriends(
  prisma: PrismaClient,
  userId: string,
): Promise<FriendSummary[]> {
  const rows = await prisma.friendRequest.findMany({
    where: {
      status: 'accepted',
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    include: {
      fromUser: {
        select: {
          id: true,
          firstName: true,
          username: true,
          photoUrl: true,
          clientStreak: true,
        },
      },
      toUser: {
        select: {
          id: true,
          firstName: true,
          username: true,
          photoUrl: true,
          clientStreak: true,
        },
      },
    },
  });

  const friends = rows.map((row) => {
    const friend = row.fromUserId === userId ? row.toUser : row.fromUser;
    return {
      userId: friend.id,
      displayName: displayName(friend),
      username: friend.username,
      streak: parseStreakLength(friend.clientStreak),
      ...(friend.photoUrl ? { photoUrl: friend.photoUrl } : {}),
    } satisfies FriendSummary;
  });

  return sortFriendsByStreakDesc(friends);
}
