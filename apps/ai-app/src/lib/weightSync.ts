import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { shouldApplyDelete, shouldApplyUpsert } from './mealSync.js';

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const weightPayloadSchema = z.object({
  id: z.string().min(1),
  date: dayKey,
  kg: z.number().positive(),
  clientUpdatedAt: isoDateTime,
});

export const weightDeleteSchema = z.object({
  id: z.string().min(1),
  clientUpdatedAt: isoDateTime,
});

export const weightSyncBodySchema = z.object({
  since: isoDateTime.optional(),
  upserts: z.array(weightPayloadSchema).default([]),
  deletes: z.array(weightDeleteSchema).default([]),
  goalKg: z.number().positive().nullable().optional(),
});

export type WeightPayload = z.infer<typeof weightPayloadSchema>;
export type WeightSyncBody = z.infer<typeof weightSyncBodySchema>;

export type WeightSyncResponse = {
  weights: WeightPayload[];
  tombstones: string[];
  goalKg: number | null;
};

function rowToPayload(row: {
  id: string;
  date: string;
  kg: number;
  clientUpdatedAt: Date;
}): WeightPayload {
  return {
    id: row.id,
    date: row.date,
    kg: row.kg,
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
  };
}

export async function applyWeightSync(
  prisma: PrismaClient,
  userId: string,
  body: WeightSyncBody,
): Promise<WeightSyncResponse> {
  for (const upsert of body.upserts) {
    const stored = await prisma.weightEntry.findFirst({
      where: { id: upsert.id, userId },
    });
    if (!shouldApplyUpsert(stored, upsert.clientUpdatedAt)) continue;

    const data = {
      id: upsert.id,
      userId,
      date: upsert.date,
      kg: upsert.kg,
      clientUpdatedAt: new Date(upsert.clientUpdatedAt),
      deletedAt: null as Date | null,
    };

    const anyRow = await prisma.weightEntry.findUnique({
      where: { id: upsert.id },
    });
    if (anyRow && anyRow.userId !== userId) continue;

    if (anyRow) {
      await prisma.weightEntry.update({
        where: { id: upsert.id },
        data: {
          date: data.date,
          kg: data.kg,
          clientUpdatedAt: data.clientUpdatedAt,
          deletedAt: null,
        },
      });
    } else {
      await prisma.weightEntry.create({ data });
    }
  }

  for (const del of body.deletes) {
    const stored = await prisma.weightEntry.findFirst({
      where: { id: del.id, userId },
    });
    if (!shouldApplyDelete(stored, del.clientUpdatedAt)) continue;

    const clock = new Date(del.clientUpdatedAt);
    if (stored) {
      await prisma.weightEntry.update({
        where: { id: del.id },
        data: { deletedAt: clock, clientUpdatedAt: clock },
      });
    } else {
      const anyRow = await prisma.weightEntry.findUnique({
        where: { id: del.id },
      });
      if (anyRow) continue;
      await prisma.weightEntry.create({
        data: {
          id: del.id,
          userId,
          date: '1970-01-01',
          kg: 0,
          clientUpdatedAt: clock,
          deletedAt: clock,
        },
      });
    }
  }

  if (body.goalKg !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { goalKg: body.goalKg },
    });
  }

  const since = body.since ? new Date(body.since) : null;
  const rows = await prisma.weightEntry.findMany({
    where: {
      userId,
      ...(since
        ? {
            OR: [
              { clientUpdatedAt: { gt: since } },
              { deletedAt: { gt: since } },
            ],
          }
        : {}),
    },
    orderBy: { clientUpdatedAt: 'asc' },
  });

  const weights: WeightPayload[] = [];
  const tombstones: string[] = [];
  for (const row of rows) {
    if (row.deletedAt) tombstones.push(row.id);
    else weights.push(rowToPayload(row));
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { goalKg: true },
  });

  return {
    weights,
    tombstones,
    goalKg: user?.goalKg ?? null,
  };
}
