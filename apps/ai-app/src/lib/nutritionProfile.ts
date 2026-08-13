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
  planStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  planStartWeight: z.number().positive().optional(),
});

const targetsSchema = z.object({
  kcal: z.number().positive(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
});

const micronutrientIdSchema = z.enum([
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminB12',
  'iron',
  'calcium',
  'folate',
  'magnesium',
]);

const micronutrientTargetSchema = z.object({
  id: micronutrientIdSchema,
  amount: z.number(),
  unit: z.enum(['mg', 'µg']),
});

export const nutritionProfileBodySchema = z.object({
  profile: profileSchema,
  targets: targetsSchema,
  micronutrientTargets: z
    .array(micronutrientTargetSchema)
    .nullable()
    .optional(),
});

export type NutritionProfilePayload = z.infer<typeof nutritionProfileBodySchema>;

export function parseNutritionProfile(
  value: unknown,
): NutritionProfilePayload | null {
  const parsed = nutritionProfileBodySchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (data.micronutrientTargets === undefined) {
    const { micronutrientTargets: _omit, ...rest } = data;
    return rest;
  }
  return data;
}

export function serializeNutritionProfile(
  payload: NutritionProfilePayload,
): NutritionProfilePayload {
  return nutritionProfileBodySchema.parse(payload);
}
