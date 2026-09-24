import type { MicronutrientId, MicronutrientUnit } from '@ai-food/shared-types';
import { MICRONUTRIENT_UNITS } from '@ai-food/shared-types';

/** Units the user may type into the manual add field. */
export type MicronutrientInputUnit = MicronutrientUnit | 'iu';

export const MICRONUTRIENT_INPUT_UNIT_STORAGE_KEY =
  'ai-food-micronutrient-input-units';

/** Nutrients that commonly use IU/МЕ on supplement labels. */
const IU_SUPPORTED = new Set<MicronutrientId>([
  'vitaminA',
  'vitaminD',
  'vitaminE',
]);

/** IU → canonical mass (same factors as gateway supplement prompts). */
const IU_TO_CANONICAL: Partial<
  Record<MicronutrientId, { factor: number; unit: MicronutrientUnit }>
> = {
  vitaminD: { factor: 0.025, unit: 'µg' },
  vitaminA: { factor: 0.3, unit: 'µg' },
  vitaminE: { factor: 0.67, unit: 'mg' },
};

export function formatInputUnitLabel(unit: MicronutrientInputUnit): string {
  if (unit === 'iu') return 'UE';
  return unit === 'µg' ? 'мкг' : 'мг';
}

export function isMicronutrientInputUnit(
  value: unknown,
): value is MicronutrientInputUnit {
  return value === 'mg' || value === 'µg' || value === 'iu';
}

export function inputUnitsFor(
  nutrientId: MicronutrientId,
): MicronutrientInputUnit[] {
  const canonical = MICRONUTRIENT_UNITS[nutrientId];
  const other: MicronutrientUnit = canonical === 'mg' ? 'µg' : 'mg';
  const units: MicronutrientInputUnit[] = [canonical, other];
  if (IU_SUPPORTED.has(nutrientId)) units.push('iu');
  return units;
}

export function defaultInputUnit(
  nutrientId: MicronutrientId,
): MicronutrientInputUnit {
  return MICRONUTRIENT_UNITS[nutrientId];
}

/**
 * Convert a draft amount in `inputUnit` into the nutrient's canonical mg/µg.
 */
export function toCanonicalMicronutrientAmount(
  amount: number,
  inputUnit: MicronutrientInputUnit,
  nutrientId: MicronutrientId,
): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const target = MICRONUTRIENT_UNITS[nutrientId];
  let canonical: number;

  if (inputUnit === 'iu') {
    const rule = IU_TO_CANONICAL[nutrientId];
    if (!rule || rule.unit !== target) return null;
    canonical = amount * rule.factor;
  } else if (inputUnit === target) {
    canonical = amount;
  } else if (inputUnit === 'mg' && target === 'µg') {
    canonical = amount * 1000;
  } else if (inputUnit === 'µg' && target === 'mg') {
    canonical = amount / 1000;
  } else {
    return null;
  }

  if (!Number.isFinite(canonical) || canonical <= 0) return null;
  return Math.round(canonical * 1000) / 1000;
}

function readAllPrefs(): Partial<Record<MicronutrientId, MicronutrientInputUnit>> {
  try {
    const raw = localStorage.getItem(MICRONUTRIENT_INPUT_UNIT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: Partial<Record<MicronutrientId, MicronutrientInputUnit>> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isMicronutrientInputUnit(value)) {
        out[key as MicronutrientId] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function readStoredInputUnit(
  nutrientId: MicronutrientId,
): MicronutrientInputUnit {
  const stored = readAllPrefs()[nutrientId];
  const allowed = inputUnitsFor(nutrientId);
  if (stored && allowed.includes(stored)) return stored;
  return defaultInputUnit(nutrientId);
}

export function writeStoredInputUnit(
  nutrientId: MicronutrientId,
  unit: MicronutrientInputUnit,
): void {
  const allowed = inputUnitsFor(nutrientId);
  if (!allowed.includes(unit)) return;
  try {
    const next = { ...readAllPrefs(), [nutrientId]: unit };
    localStorage.setItem(
      MICRONUTRIENT_INPUT_UNIT_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // ignore quota / private mode
  }
}
