import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { lwwWins } from './mealSync.js';

const localDateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

const calorieStreakSchema = z.object({
  currentLength: z.number().int().min(0).max(10_000),
  freezeCount: z.number().int().min(0).max(2),
  consumedFreezeDateKeys: z.array(localDateKey).max(400),
  grantedMilestones: z.array(z.number().int().min(0).max(100)),
  bestStreak: z.number().int().min(0).max(10_000),
});

export const EMPTY_CALORIE_STREAK_PAYLOAD = {
  currentLength: 0,
  freezeCount: 0,
  consumedFreezeDateKeys: [] as string[],
  grantedMilestones: [] as number[],
  bestStreak: 0,
};

export const streakPayloadSchema = z.object({
  currentLength: z.number().int().min(0).max(10_000),
  freezeCount: z.number().int().min(0).max(2),
  consumedFreezeDateKeys: z.array(localDateKey).max(400),
  grantedMilestones: z.array(z.number().int().min(0).max(100)),
  lastCelebratedLocalDate: z.string().max(10),
  bestStreak: z.number().int().min(0).max(10_000),
  calorieStreak: calorieStreakSchema.optional(),
});

export const streakSyncBodySchema = z.object({
  streak: streakPayloadSchema,
  clientUpdatedAt: isoDateTime,
});

export type StreakPayload = z.infer<typeof streakPayloadSchema>;
export type StreakSyncBody = z.infer<typeof streakSyncBodySchema>;
type CalorieStreakPayload = z.infer<typeof calorieStreakSchema>;

export type StreakSyncResponse = {
  streak: StreakPayload & { calorieStreak: CalorieStreakPayload };
  clientUpdatedAt: string;
};

function resolveCalorieStreak(
  incoming: StreakPayload['calorieStreak'],
  stored: StreakPayload['calorieStreak'],
): CalorieStreakPayload {
  return incoming ?? stored ?? EMPTY_CALORIE_STREAK_PAYLOAD;
}

function withCalorieStreak(
  streak: StreakPayload,
  calorieStreak: CalorieStreakPayload,
): StreakSyncResponse['streak'] {
  return { ...streak, calorieStreak };
}

function parseStoredStreak(value: unknown): StreakPayload | null {
  const parsed = streakPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function applyStreakSync(
  prisma: PrismaClient,
  userId: string,
  body: StreakSyncBody,
): Promise<StreakSyncResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clientStreak: true, streakClientUpdatedAt: true },
  });

  const storedAt = user?.streakClientUpdatedAt ?? null;
  const storedStreak = parseStoredStreak(user?.clientStreak ?? null);

  if (
    storedStreak &&
    storedAt &&
    !lwwWins(body.clientUpdatedAt, storedAt)
  ) {
    return {
      streak: withCalorieStreak(
        storedStreak,
        storedStreak.calorieStreak ?? EMPTY_CALORIE_STREAK_PAYLOAD,
      ),
      clientUpdatedAt: storedAt.toISOString(),
    };
  }

  const streak = withCalorieStreak(
    body.streak,
    resolveCalorieStreak(body.streak.calorieStreak, storedStreak?.calorieStreak),
  );
  const clock = new Date(body.clientUpdatedAt);
  await prisma.user.update({
    where: { id: userId },
    data: {
      clientStreak: streak,
      streakClientUpdatedAt: clock,
    },
  });

  return {
    streak,
    clientUpdatedAt: clock.toISOString(),
  };
}
