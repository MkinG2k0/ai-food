export interface KbjuReference {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodBenchmark {
  id: string;
  name: string;
  /** Paths under /public/ai-food/ (e.g. images/01194.jpg) */
  imageFiles: string[];
  reference: KbjuReference;
  /** Correct dish label from classification_en.jsonl, when available */
  classificationLabel?: string;
}

/** How many API calls to run per food per model. */
export const RUNS_PER_FOOD = 3;

/** Cap samples so a full images/ dump does not explode API cost. */
export const BENCHMARK_LIMIT = 20;

interface NutritionGroundTruth {
  refined_dish_name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

interface NutritionRow {
  id: number;
  standard_image: string;
  user_images?: string[];
  ground_truth: NutritionGroundTruth;
}

interface ClassificationRow {
  id: number;
  ground_truth: string;
  options: string[];
}

function parseJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export function letterIndex(letter: string): number {
  const trimmed = letter.trim().toUpperCase();
  if (trimmed.length !== 1) return -1;
  const code = trimmed.charCodeAt(0);
  if (code < 65 || code > 90) return -1;
  return code - 65;
}

function rowImages(row: {
  standard_image?: string;
  user_images?: string[];
  images?: string[];
}): string[] {
  const all = [
    ...(row.standard_image ? [row.standard_image] : []),
    ...(row.user_images ?? []),
    ...(row.images ?? []),
  ];
  return [...new Set(all)];
}

export function pickLocalImages(
  candidates: string[],
  available: Set<string>,
): string[] {
  return candidates.filter((p) => available.has(p));
}

export function aiFoodUrl(relativePath: string): string {
  return `/ai-food/${relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

/**
 * Builds KBJU benchmarks from nutrition_en.jsonl, keeping only rows that have
 * at least one file listed in available_images.json (local images/ folder).
 * Classification labels are joined by id when present.
 */
export async function loadFoodBenchmarks(): Promise<FoodBenchmark[]> {
  const [availableRes, nutritionRes, classificationRes] = await Promise.all([
    fetch('/ai-food/available_images.json'),
    fetch('/ai-food/nutrition_en.jsonl'),
    fetch('/ai-food/classification_en.jsonl'),
  ]);

  if (!availableRes.ok) {
    throw new Error('Не удалось загрузить available_images.json');
  }
  if (!nutritionRes.ok) {
    throw new Error('Не удалось загрузить nutrition_en.jsonl');
  }

  const availableList = (await availableRes.json()) as string[];
  const available = new Set(availableList);
  const nutritionRows = parseJsonl<NutritionRow>(await nutritionRes.text());

  const classificationById = new Map<number, ClassificationRow>();
  if (classificationRes.ok) {
    for (const row of parseJsonl<ClassificationRow>(
      await classificationRes.text(),
    )) {
      classificationById.set(row.id, row);
    }
  }

  const benchmarks: FoodBenchmark[] = [];

  for (const row of nutritionRows) {
    const imageFiles = pickLocalImages(rowImages(row), available);
    if (imageFiles.length === 0) continue;

    const gt = row.ground_truth;
    const classification = classificationById.get(row.id);
    const optionIdx = classification
      ? letterIndex(classification.ground_truth)
      : -1;
    const classificationLabel =
      classification && optionIdx >= 0
        ? classification.options[optionIdx]
        : undefined;

    benchmarks.push({
      id: String(row.id),
      name: gt.refined_dish_name,
      imageFiles,
      reference: {
        calories: gt.calories,
        protein: gt.protein,
        fat: gt.fat,
        carbs: gt.carbohydrates,
      },
      classificationLabel,
    });

    if (benchmarks.length >= BENCHMARK_LIMIT) break;
  }

  return benchmarks;
}
