export type MicronutrientStatusBand =
  | 'no_data'
  | 'severe_deficit'
  | 'below_norm'
  | 'optimal'
  | 'surplus';

export interface MicronutrientStatus {
  band: MicronutrientStatusBand;
  /** Fraction of daily norm; null when no estimate for the period */
  ratio: number | null;
  labelRu: string;
  /** Tailwind classes for progress bar fill */
  barClass: string;
  /** Tailwind classes for meal badges */
  badgeClass: string;
}

/** Severe deficit &lt; 40%; below 40–80%; optimal 80–120%; surplus &gt; 120%. */
export function getMicronutrientStatus(
  ratio: number | null,
): MicronutrientStatus {
  if (ratio == null || !Number.isFinite(ratio)) {
    return {
      band: 'no_data',
      ratio: null,
      labelRu: 'нет данных',
      barClass: 'bg-muted-foreground/30',
      badgeClass: 'bg-secondary text-secondary-foreground',
    };
  }

  if (ratio < 0.4) {
    return {
      band: 'severe_deficit',
      ratio,
      labelRu: 'дефицит',
      barClass: 'bg-red-500',
      badgeClass: 'bg-red-50 text-red-800 border-red-100',
    };
  }

  if (ratio < 0.8) {
    return {
      band: 'below_norm',
      ratio,
      labelRu: 'ниже нормы',
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-100',
    };
  }

  if (ratio <= 1.2) {
    return {
      band: 'optimal',
      ratio,
      labelRu: 'норма',
      barClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    };
  }

  return {
    band: 'surplus',
    ratio,
    labelRu: 'профицит',
    barClass: 'bg-violet-500',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-100',
  };
}
