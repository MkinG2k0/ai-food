import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { shouldApplyDelete, shouldApplyUpsert } from './mealSync.js';

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

export const favoritePayloadSchema = z.object({
  id: z.string().min(1),
  sourceMealId: z.string().min(1),
  name: z.string().min(1),
  items: z.array(z.unknown()),
  totalCalories: z.number(),
  portions: z.number().optional(),
  imageUri: z.string().nullable().optional(),
  imageUris: z.array(z.string()).nullable().optional(),
  healthiness: z.number().optional(),
  confidence: z.number().optional(),
  micronutrients: z.unknown().optional(),
  createdAt: isoDateTime.optional(),
  clientUpdatedAt: isoDateTime,
});

export const favoriteDeleteSchema = z.object({
  id: z.string().min(1),
  clientUpdatedAt: isoDateTime,
});

export const favoriteSyncBodySchema = z.object({
  since: isoDateTime.optional(),
  upserts: z.array(favoritePayloadSchema).default([]),
  deletes: z.array(favoriteDeleteSchema).default([]),
});

export type FavoritePayload = z.infer<typeof favoritePayloadSchema>;
export type FavoriteSyncBody = z.infer<typeof favoriteSyncBodySchema>;

export type FavoriteSyncResponse = {
  favorites: FavoritePayload[];
  tombstones: string[];
};

function rowToPayload(row: {
  id: string;
  sourceMealId: string;
  name: string;
  items: unknown;
  totalCalories: number;
  portions: number | null;
  imageUri: string | null;
  imageUris: unknown;
  healthiness: number | null;
  confidence: number | null;
  micronutrients: unknown;
  createdAtClient: Date | null;
  clientUpdatedAt: Date;
}): FavoritePayload {
  const payload: FavoritePayload = {
    id: row.id,
    sourceMealId: row.sourceMealId,
    name: row.name,
    items: Array.isArray(row.items) ? row.items : [],
    totalCalories: row.totalCalories,
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
  };
  if (row.portions != null) payload.portions = row.portions;
  if (row.imageUri != null) payload.imageUri = row.imageUri;
  if (Array.isArray(row.imageUris)) payload.imageUris = row.imageUris as string[];
  if (row.healthiness != null) payload.healthiness = row.healthiness;
  if (row.confidence != null) payload.confidence = row.confidence;
  if (row.micronutrients != null) payload.micronutrients = row.micronutrients;
  if (row.createdAtClient) payload.createdAt = row.createdAtClient.toISOString();
  return payload;
}

export async function applyFavoriteSync(
  prisma: PrismaClient,
  userId: string,
  body: FavoriteSyncBody,
): Promise<FavoriteSyncResponse> {
  for (const upsert of body.upserts) {
    const stored = await prisma.favorite.findFirst({
      where: { id: upsert.id, userId },
    });
    if (!shouldApplyUpsert(stored, upsert.clientUpdatedAt)) continue;

    const data = {
      id: upsert.id,
      userId,
      sourceMealId: upsert.sourceMealId,
      name: upsert.name,
      items: upsert.items,
      totalCalories: upsert.totalCalories,
      portions: upsert.portions ?? null,
      imageUri: upsert.imageUri ?? null,
      imageUris: upsert.imageUris ?? null,
      healthiness: upsert.healthiness ?? null,
      confidence: upsert.confidence ?? null,
      micronutrients: upsert.micronutrients ?? null,
      createdAtClient: upsert.createdAt ? new Date(upsert.createdAt) : null,
      clientUpdatedAt: new Date(upsert.clientUpdatedAt),
      deletedAt: null as Date | null,
    };

    const anyRow = await prisma.favorite.findUnique({ where: { id: upsert.id } });
    if (anyRow && anyRow.userId !== userId) continue;

    if (anyRow) {
      await prisma.favorite.update({
        where: { id: upsert.id },
        data: {
          sourceMealId: data.sourceMealId,
          name: data.name,
          items: data.items as object,
          totalCalories: data.totalCalories,
          portions: data.portions,
          imageUri: data.imageUri,
          imageUris: data.imageUris as object | null,
          healthiness: data.healthiness,
          confidence: data.confidence,
          micronutrients: data.micronutrients as object | null,
          createdAtClient: data.createdAtClient,
          clientUpdatedAt: data.clientUpdatedAt,
          deletedAt: null,
        },
      });
    } else {
      await prisma.favorite.create({
        data: {
          ...data,
          items: data.items as object,
          imageUris: data.imageUris as object | null,
          micronutrients: data.micronutrients as object | null,
        },
      });
    }
  }

  for (const del of body.deletes) {
    const stored = await prisma.favorite.findFirst({
      where: { id: del.id, userId },
    });
    if (!shouldApplyDelete(stored, del.clientUpdatedAt)) continue;

    const clock = new Date(del.clientUpdatedAt);
    if (stored) {
      await prisma.favorite.update({
        where: { id: del.id },
        data: { deletedAt: clock, clientUpdatedAt: clock },
      });
    } else {
      const anyRow = await prisma.favorite.findUnique({ where: { id: del.id } });
      if (anyRow) continue;
      await prisma.favorite.create({
        data: {
          id: del.id,
          userId,
          sourceMealId: 'tombstone',
          name: '',
          items: [],
          totalCalories: 0,
          clientUpdatedAt: clock,
          deletedAt: clock,
        },
      });
    }
  }

  const since = body.since ? new Date(body.since) : null;
  const rows = await prisma.favorite.findMany({
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

  const favorites: FavoritePayload[] = [];
  const tombstones: string[] = [];
  for (const row of rows) {
    if (row.deletedAt) tombstones.push(row.id);
    else favorites.push(rowToPayload(row));
  }
  return { favorites, tombstones };
}
