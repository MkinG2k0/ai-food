import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const foodTypeSchema = z.enum([
  'salad',
  'soup',
  'sandwich',
  'pizza',
  'sushi',
  'fish',
  'burger',
  'bowl',
  'chicken',
  'meat',
  'pasta',
  'bakery',
  'main',
  'snack',
  'dessert',
  'drink',
]);

export const mealPayloadSchema = z.object({
  id: z.string().min(1),
  timestamp: isoDateTime,
  items: z.array(z.unknown()),
  totalCalories: z.number(),
  name: z.string().optional(),
  foodType: foodTypeSchema.optional(),
  imageUri: z.string().nullable().optional(),
  imageUris: z.array(z.string()).nullable().optional(),
  status: z.string().optional(),
  portions: z.number().optional(),
  totalGrams: z.number().optional(),
  healthiness: z.number().optional(),
  confidence: z.number().optional(),
  analyzeErrorCode: z.string().optional(),
  micronutrients: z.unknown().optional(),
  aiModel: z.string().optional(),
  portionReference: z.string().optional(),
  addedSugar: z.number().optional(),
  confidenceReason: z.string().optional(),
  healthinessReason: z.string().optional(),
  disclaimers: z.array(z.string()).optional(),
  customContent: z.string().optional(),
  customContentEntries: z.unknown().optional(),
  clientUpdatedAt: isoDateTime,
});

export const mealDeleteSchema = z.object({
  id: z.string().min(1),
  clientUpdatedAt: isoDateTime,
});

export const mealSyncBodySchema = z.object({
  since: isoDateTime.optional(),
  upserts: z.array(mealPayloadSchema).default([]),
  deletes: z.array(mealDeleteSchema).default([]),
});

export type MealPayload = z.infer<typeof mealPayloadSchema>;
export type MealDelete = z.infer<typeof mealDeleteSchema>;
export type MealSyncBody = z.infer<typeof mealSyncBodySchema>;

export type MealSyncResponse = {
  meals: MealPayload[];
  tombstones: string[];
};

/** Incoming wins when its clock is >= stored (LWW). Missing stored always loses. */
export function lwwWins(
  incomingAt: string | Date,
  storedAt: string | Date | null | undefined,
): boolean {
  if (storedAt == null) return true;
  return new Date(incomingAt).getTime() >= new Date(storedAt).getTime();
}

export function shouldApplyUpsert(
  stored: { clientUpdatedAt: Date; deletedAt: Date | null } | null,
  incomingClientUpdatedAt: string,
): boolean {
  if (!stored) return true;
  return lwwWins(incomingClientUpdatedAt, stored.clientUpdatedAt);
}

export function shouldApplyDelete(
  stored: { clientUpdatedAt: Date; deletedAt: Date | null } | null,
  deleteClientUpdatedAt: string,
): boolean {
  if (!stored) return true;
  return lwwWins(deleteClientUpdatedAt, stored.clientUpdatedAt);
}

type MealRow = {
  id: string;
  timestamp: Date;
  name: string | null;
  foodType: string | null;
  items: unknown;
  totalCalories: number;
  portions: number | null;
  totalGrams: number | null;
  status: string | null;
  healthiness: number | null;
  confidence: number | null;
  analyzeErrorCode: string | null;
  micronutrients: unknown;
  aiModel: string | null;
  portionReference: string | null;
  addedSugar: number | null;
  confidenceReason: string | null;
  healthinessReason: string | null;
  disclaimers: unknown;
  customContent: string | null;
  customContentEntries: unknown;
  imageUri: string | null;
  imageUris: unknown;
  clientUpdatedAt: Date;
  deletedAt: Date | null;
};

function optionalString(v: string | null | undefined): string | undefined {
  return v == null ? undefined : v;
}

function optionalNumber(v: number | null | undefined): number | undefined {
  return v == null ? undefined : v;
}

export function mealRowToPayload(row: MealRow): MealPayload {
  const payload: MealPayload = {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    items: Array.isArray(row.items) ? row.items : [],
    totalCalories: row.totalCalories,
    clientUpdatedAt: row.clientUpdatedAt.toISOString(),
  };
  const name = optionalString(row.name);
  if (name !== undefined) payload.name = name;
  if (row.foodType !== null && foodTypeSchema.safeParse(row.foodType).success) {
    payload.foodType = row.foodType as MealPayload['foodType'];
  }
  if (row.imageUri != null) payload.imageUri = row.imageUri;
  if (Array.isArray(row.imageUris)) {
    payload.imageUris = row.imageUris as string[];
  }
  const status = optionalString(row.status);
  if (status !== undefined) payload.status = status;
  const portions = optionalNumber(row.portions);
  if (portions !== undefined) payload.portions = portions;
  const totalGrams = optionalNumber(row.totalGrams);
  if (totalGrams !== undefined) payload.totalGrams = totalGrams;
  const healthiness = optionalNumber(row.healthiness);
  if (healthiness !== undefined) payload.healthiness = healthiness;
  const confidence = optionalNumber(row.confidence);
  if (confidence !== undefined) payload.confidence = confidence;
  const analyzeErrorCode = optionalString(row.analyzeErrorCode);
  if (analyzeErrorCode !== undefined) payload.analyzeErrorCode = analyzeErrorCode;
  if (row.micronutrients != null) payload.micronutrients = row.micronutrients;
  const aiModel = optionalString(row.aiModel);
  if (aiModel !== undefined) payload.aiModel = aiModel;
  const portionReference = optionalString(row.portionReference);
  if (portionReference !== undefined) payload.portionReference = portionReference;
  const addedSugar = optionalNumber(row.addedSugar);
  if (addedSugar !== undefined) payload.addedSugar = addedSugar;
  const confidenceReason = optionalString(row.confidenceReason);
  if (confidenceReason !== undefined) payload.confidenceReason = confidenceReason;
  const healthinessReason = optionalString(row.healthinessReason);
  if (healthinessReason !== undefined) {
    payload.healthinessReason = healthinessReason;
  }
  if (Array.isArray(row.disclaimers)) {
    payload.disclaimers = row.disclaimers as string[];
  }
  if (row.customContent != null) payload.customContent = row.customContent;
  if (row.customContentEntries != null) {
    payload.customContentEntries = row.customContentEntries;
  }
  return payload;
}

function payloadToWriteData(payload: MealPayload, userId: string) {
  return {
    id: payload.id,
    userId,
    timestamp: new Date(payload.timestamp),
    name: payload.name ?? null,
    foodType: payload.foodType ?? null,
    items: payload.items,
    totalCalories: payload.totalCalories,
    portions: payload.portions ?? null,
    totalGrams: payload.totalGrams ?? null,
    status: payload.status ?? null,
    healthiness: payload.healthiness ?? null,
    confidence: payload.confidence ?? null,
    analyzeErrorCode: payload.analyzeErrorCode ?? null,
    micronutrients: payload.micronutrients ?? null,
    aiModel: payload.aiModel ?? null,
    portionReference: payload.portionReference ?? null,
    addedSugar: payload.addedSugar ?? null,
    confidenceReason: payload.confidenceReason ?? null,
    healthinessReason: payload.healthinessReason ?? null,
    disclaimers: payload.disclaimers ?? null,
    customContent: payload.customContent ?? null,
    customContentEntries: payload.customContentEntries ?? null,
    imageUri: payload.imageUri ?? null,
    imageUris: payload.imageUris ?? null,
    clientUpdatedAt: new Date(payload.clientUpdatedAt),
    deletedAt: null as Date | null,
  };
}

export async function applyMealSync(
  prisma: PrismaClient,
  userId: string,
  body: MealSyncBody,
): Promise<MealSyncResponse> {
  for (const upsert of body.upserts) {
    const stored = await prisma.meal.findFirst({
      where: { id: upsert.id, userId },
    });
    if (!shouldApplyUpsert(stored, upsert.clientUpdatedAt)) continue;

    const data = payloadToWriteData(upsert, userId);
    if (stored) {
      await prisma.meal.update({
        where: { id: upsert.id },
        data: {
          timestamp: data.timestamp,
          name: data.name,
          foodType: data.foodType,
          items: data.items as object,
          totalCalories: data.totalCalories,
          portions: data.portions,
          totalGrams: data.totalGrams,
          status: data.status,
          healthiness: data.healthiness,
          confidence: data.confidence,
          analyzeErrorCode: data.analyzeErrorCode,
          micronutrients: data.micronutrients as object | null,
          aiModel: data.aiModel,
          portionReference: data.portionReference,
          addedSugar: data.addedSugar,
          confidenceReason: data.confidenceReason,
          healthinessReason: data.healthinessReason,
          disclaimers: data.disclaimers as object | null,
          customContent: data.customContent,
          customContentEntries: data.customContentEntries as object | null,
          imageUri: data.imageUri,
          imageUris: data.imageUris as object | null,
          clientUpdatedAt: data.clientUpdatedAt,
          deletedAt: null,
        },
      });
    } else {
      // Only create if id is free or belongs to this user (id is global PK).
      const anyRow = await prisma.meal.findUnique({ where: { id: upsert.id } });
      if (anyRow && anyRow.userId !== userId) {
        // Ownership: never overwrite another user's meal.
        continue;
      }
      if (anyRow) {
        await prisma.meal.update({
          where: { id: upsert.id },
          data: {
            timestamp: data.timestamp,
            name: data.name,
            foodType: data.foodType,
            items: data.items as object,
            totalCalories: data.totalCalories,
            portions: data.portions,
            totalGrams: data.totalGrams,
            status: data.status,
            healthiness: data.healthiness,
            confidence: data.confidence,
            analyzeErrorCode: data.analyzeErrorCode,
            micronutrients: data.micronutrients as object | null,
            aiModel: data.aiModel,
            portionReference: data.portionReference,
            addedSugar: data.addedSugar,
            confidenceReason: data.confidenceReason,
            healthinessReason: data.healthinessReason,
            disclaimers: data.disclaimers as object | null,
            customContent: data.customContent,
            customContentEntries: data.customContentEntries as object | null,
            imageUri: data.imageUri,
            imageUris: data.imageUris as object | null,
            clientUpdatedAt: data.clientUpdatedAt,
            deletedAt: null,
          },
        });
      } else {
        await prisma.meal.create({
          data: {
            ...data,
            items: data.items as object,
            micronutrients: data.micronutrients as object | null,
            disclaimers: data.disclaimers as object | null,
            customContentEntries: data.customContentEntries as object | null,
            imageUris: data.imageUris as object | null,
          },
        });
      }
    }
  }

  for (const del of body.deletes) {
    const stored = await prisma.meal.findFirst({
      where: { id: del.id, userId },
    });
    if (!shouldApplyDelete(stored, del.clientUpdatedAt)) continue;

    const clock = new Date(del.clientUpdatedAt);
    if (stored) {
      await prisma.meal.update({
        where: { id: del.id },
        data: { deletedAt: clock, clientUpdatedAt: clock },
      });
    } else {
      const anyRow = await prisma.meal.findUnique({ where: { id: del.id } });
      if (anyRow) continue; // other user's id — ignore
      // Tombstone-only create: minimal row so other devices learn the delete.
      await prisma.meal.create({
        data: {
          id: del.id,
          userId,
          timestamp: clock,
          items: [],
          totalCalories: 0,
          clientUpdatedAt: clock,
          deletedAt: clock,
        },
      });
    }
  }

  const since = body.since ? new Date(body.since) : null;
  const rows = await prisma.meal.findMany({
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

  const meals: MealPayload[] = [];
  const tombstones: string[] = [];
  for (const row of rows) {
    if (row.deletedAt) {
      tombstones.push(row.id);
    } else {
      meals.push(mealRowToPayload(row));
    }
  }
  return { meals, tombstones };
}
