import { z } from 'zod';

const profileSchema = z.object({
  gender: z.enum(['male', 'female']),
  age: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().positive(),
  targetWeight: z.number().positive(),
  targetWeightDate: z.string().min(1),
  activity: z.enum(['low', 'medium', 'high']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  dietType: z.enum(['none', 'halal', 'vegan', 'vegetarian']),
});

const targetsSchema = z.object({
  kcal: z.number().positive(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
});

export const nutritionProfileBodySchema = z.object({
  profile: profileSchema,
  targets: targetsSchema,
});

export type NutritionProfilePayload = z.infer<typeof nutritionProfileBodySchema>;

export function parseNutritionProfile(
  value: unknown,
): NutritionProfilePayload | null {
  const parsed = nutritionProfileBodySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function serializeNutritionProfile(
  payload: NutritionProfilePayload,
): NutritionProfilePayload {
  return nutritionProfileBodySchema.parse(payload);
}
