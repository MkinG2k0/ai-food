import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { lwwWins } from './mealSync.js';

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

export const settingsPayloadSchema = z.object({
  customInstructions: z.string().max(2000),
  customInstructionsEnabled: z.boolean(),
  aiModel: z.string().min(1),
  featureVitamins: z.boolean(),
  featureHealthiness: z.boolean(),
  featureComposition: z.boolean(),
  calendarRings: z.object({
    kcal: z.boolean(),
    protein: z.boolean(),
    fat: z.boolean(),
    carbs: z.boolean(),
  }),
});

export const settingsSyncBodySchema = z.object({
  settings: settingsPayloadSchema,
  clientUpdatedAt: isoDateTime,
});

export type SettingsPayload = z.infer<typeof settingsPayloadSchema>;
export type SettingsSyncBody = z.infer<typeof settingsSyncBodySchema>;

export type SettingsSyncResponse = {
  settings: SettingsPayload;
  clientUpdatedAt: string;
};

function parseStoredSettings(value: unknown): SettingsPayload | null {
  const parsed = settingsPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function applySettingsSync(
  prisma: PrismaClient,
  userId: string,
  body: SettingsSyncBody,
): Promise<SettingsSyncResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clientSettings: true, settingsClientUpdatedAt: true },
  });

  const storedAt = user?.settingsClientUpdatedAt ?? null;
  const storedSettings = parseStoredSettings(user?.clientSettings ?? null);

  if (
    storedSettings &&
    storedAt &&
    !lwwWins(body.clientUpdatedAt, storedAt)
  ) {
    return {
      settings: storedSettings,
      clientUpdatedAt: storedAt.toISOString(),
    };
  }

  const clock = new Date(body.clientUpdatedAt);
  await prisma.user.update({
    where: { id: userId },
    data: {
      clientSettings: body.settings,
      settingsClientUpdatedAt: clock,
    },
  });

  return {
    settings: body.settings,
    clientUpdatedAt: clock.toISOString(),
  };
}
