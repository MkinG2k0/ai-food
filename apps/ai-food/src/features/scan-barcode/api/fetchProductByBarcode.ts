export interface OffNutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface OffProduct {
  code: string;
  name: string;
  brands?: string;
  servingSize?: string;
  imageUrl?: string;
  per100g: OffNutritionPer100g;
}

interface OffNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
}

interface OffApiProduct {
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  serving_size?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  nutriments?: OffNutriments;
}

interface OffApiResponse {
  status: number;
  code?: string;
  product?: OffApiProduct;
}

const OFF_FIELDS = [
  'product_name',
  'product_name_ru',
  'brands',
  'serving_size',
  'nutriments',
  'image_front_url',
  'image_front_small_url',
].join(',');

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function resolveCalories(n: OffNutriments): number | null {
  const kcal = n['energy-kcal_100g'] ?? n['energy-kcal'];
  if (typeof kcal === 'number' && Number.isFinite(kcal) && kcal >= 0) {
    return round1(kcal);
  }
  // energy_100g is kJ → kcal
  if (typeof n.energy_100g === 'number' && Number.isFinite(n.energy_100g)) {
    return round1(n.energy_100g / 4.184);
  }
  return null;
}

function nutrient(n: OffNutriments, key: keyof OffNutriments): number {
  const v = n[key];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0;
  return round1(v);
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Parse grams from OFF serving_size strings like "32 g", "32g", "1 bar (32 g)". */
export function parseServingGrams(servingSize?: string): number | null {
  if (!servingSize?.trim()) return null;
  // Longer units first; avoid \\b — it breaks on Cyrillic in JS.
  const match = servingSize.match(
    /(\d+(?:[.,]\d+)?)\s*(?:грамм|гр|g|г)(?![a-zа-яё])/i,
  );
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Default portion: package serving when known, otherwise 100 g. */
export function defaultBarcodeGrams(product: Pick<OffProduct, 'servingSize'>): number {
  return parseServingGrams(product.servingSize) ?? 100;
}

export function mapOffApiToProduct(
  code: string,
  product: OffApiProduct,
): OffProduct | null {
  const nutriments = product.nutriments ?? {};
  const calories = resolveCalories(nutriments);
  if (calories === null) return null;

  const name =
    product.product_name_ru?.trim() ||
    product.product_name?.trim() ||
    'Без названия';

  return {
    code,
    name,
    brands: product.brands?.trim() || undefined,
    servingSize: product.serving_size?.trim() || undefined,
    imageUrl:
      product.image_front_url || product.image_front_small_url || undefined,
    per100g: {
      calories,
      protein: nutrient(nutriments, 'proteins_100g'),
      carbs: nutrient(nutriments, 'carbohydrates_100g'),
      fat: nutrient(nutriments, 'fat_100g'),
      fiber: nutrient(nutriments, 'fiber_100g'),
    },
  };
}

export class OffProductError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'NO_NUTRITION' | 'NETWORK' | 'INVALID',
  ) {
    super(message);
    this.name = 'OffProductError';
  }
}

export async function fetchProductByBarcode(rawCode: string): Promise<OffProduct> {
  const code = normalizeBarcode(rawCode);
  if (code.length < 8) {
    throw new OffProductError('Введите корректный штрихкод', 'INVALID');
  }

  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
  } catch {
    throw new OffProductError('Нет сети или Open Food Facts недоступен', 'NETWORK');
  }

  if (!response.ok) {
    throw new OffProductError('Ошибка ответа Open Food Facts', 'NETWORK');
  }

  const data = (await response.json()) as OffApiResponse;
  if (data.status !== 1 || !data.product) {
    throw new OffProductError('Продукт не найден в Open Food Facts', 'NOT_FOUND');
  }

  const mapped = mapOffApiToProduct(code, data.product);
  if (!mapped) {
    throw new OffProductError('У продукта нет данных КБЖУ', 'NO_NUTRITION');
  }

  return mapped;
}
