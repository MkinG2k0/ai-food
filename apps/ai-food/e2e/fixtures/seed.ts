/** Zustand persist envelope for Capacitor Preferences / localStorage migration. */
export function persistEnvelope<T extends object>(state: T): string {
  return JSON.stringify({ state, version: 0 });
}

export const DEFAULT_E2E_PROFILE = {
  gender: 'male' as const,
  age: 25,
  height: 170,
  weight: 70,
  activity: 'medium' as const,
  goal: 'maintain' as const,
  targetWeight: 73.5,
  targetWeightDate: '2026-11-20',
  planStartDate: '2026-08-22',
  planStartWeight: 70,
  dietType: 'none' as const,
};

export const DEFAULT_E2E_TARGETS = {
  kcal: 2546,
  protein: 126,
  fat: 71,
  carbs: 318,
  fiber: 30,
};

const DEFAULT_E2E_SETTINGS = {
  customInstructions: '',
  customInstructionsEnabled: true,
  aiModel: 'google/gemini-3-flash-preview',
  featureVitamins: true,
  featureHealthiness: true,
  featureComposition: true,
  sharePhotosToFriends: true,
  calendarRings: { kcal: true, protein: true, fat: false, carbs: true },
  statsMicronutrientIds: ['vitamin_c', 'iron', 'calcium', 'magnesium'],
  clientUpdatedAt: '2026-08-22T00:00:00.000Z',
};

export const DEMO_E2E_SESSION = {
  id: 'user-demo',
  name: 'Демо пользователь',
  username: 'demo_user',
  photo_url:
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#229ED9"/></svg>',
    ),
  telegramId: 100000001,
};

/** Seed Capacitor Preferences (web) + legacy keys for zustand persist. */
export function buildOnboardedStorage(options?: {
  meals?: unknown[];
  newsSeenDate?: string;
  settings?: Partial<typeof DEFAULT_E2E_SETTINGS>;
  favorites?: unknown[];
}): Record<string, string> {
  const entries: Record<string, string> = {
    'ai-food-profile': persistEnvelope({
      profile: DEFAULT_E2E_PROFILE,
      targets: DEFAULT_E2E_TARGETS,
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    }),
    'ai-food-pwa-install-seen': persistEnvelope({ dismissed: true }),
    'ai-food-news-seen': persistEnvelope({
      lastSeenDate: options?.newsSeenDate ?? '2026-08-19',
    }),
    'ai-food-settings': persistEnvelope({
      ...DEFAULT_E2E_SETTINGS,
      ...options?.settings,
    }),
  };

  if (options?.meals) {
    entries['ai-food-diary'] = persistEnvelope({
      meals: options.meals,
      pendingDeletes: [],
    });
  }

  if (options?.favorites) {
    entries['ai-food-favorites'] = persistEnvelope({
      favorites: options.favorites,
      pendingDeletes: [],
    });
  }

  const withCap: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    withCap[key] = value;
    withCap[`CapacitorStorage.${key}`] = value;
  }
  return withCap;
}

/** Onboarded guest + demo auth token in persist storage. */
export function buildLoggedInStorage(options?: {
  meals?: unknown[];
  newsSeenDate?: string;
  settings?: Partial<typeof DEFAULT_E2E_SETTINGS>;
  favorites?: unknown[];
}): Record<string, string> {
  const base = buildOnboardedStorage(options);
  const auth = persistEnvelope({
    session: DEMO_E2E_SESSION,
    userToken: 'e2e-demo-token',
    dataConsentAt: '2026-08-22T00:00:00.000Z',
    dataConsentVersion: '1',
  });
  base['ai-food-auth'] = auth;
  base['CapacitorStorage.ai-food-auth'] = auth;
  return base;
}

export function sampleReadyMeal(overrides?: {
  id?: string;
  name?: string;
  timestamp?: string;
  portions?: number;
  totalGrams?: number;
}) {
  const id = overrides?.id ?? 'e2e-meal-1';
  const name = overrides?.name ?? 'Овсянка с ягодами';
  return {
    id,
    timestamp: overrides?.timestamp ?? new Date().toISOString(),
    name,
    status: 'ready' as const,
    foodType: 'bowl' as const,
    totalCalories: 420,
    totalGrams: overrides?.totalGrams ?? 300,
    portions: overrides?.portions ?? 1,
    items: [
      {
        id: `${id}-item-1`,
        name: 'Овсянка',
        calories: 280,
        protein: 12,
        carbs: 48,
        fat: 6,
        fiber: 8,
        grams: 200,
      },
      {
        id: `${id}-item-2`,
        name: 'Ягоды',
        calories: 140,
        protein: 2,
        carbs: 30,
        fat: 1,
        fiber: 6,
        grams: 100,
      },
    ],
  };
}

/** Meal with composition enabled — for edit e2e. */
export function sampleMealWithItems(overrides?: {
  id?: string;
  name?: string;
}) {
  return sampleReadyMeal({
    id: overrides?.id ?? 'e2e-edit-meal',
    name: overrides?.name ?? 'Бургер с салатом',
    totalGrams: 350,
    portions: 2,
  });
}

export function sampleFavorite(overrides?: { id?: string; name?: string }) {
  const meal = sampleReadyMeal({
    id: 'e2e-fav-source',
    name: overrides?.name ?? 'Куриный салат',
  });
  return {
    id: overrides?.id ?? 'e2e-fav-1',
    sourceMealId: meal.id,
    name: meal.name,
    items: meal.items,
    totalCalories: meal.totalCalories,
    portions: 1,
    createdAt: new Date().toISOString(),
    clientUpdatedAt: new Date().toISOString(),
  };
}

/** Minimal valid NutritionResult XML for /v1/food/analyze SSE mock. */
export const MOCK_ANALYZE_XML = `<analysis>
  <foodName>Куриный салат с рисом</foodName>
  <foodType>salad</foodType>
  <totals>
    <calories unit="kcal">520</calories>
    <protein unit="g">38</protein>
    <carbs unit="g">45</carbs>
    <fat unit="g">18</fat>
    <fiber unit="g">6</fiber>
  </totals>
  <items>
    <item>
      <name>Курица</name>
      <grams>150</grams>
      <calories unit="kcal">250</calories>
      <protein unit="g">30</protein>
      <carbs unit="g">0</carbs>
      <fat unit="g">14</fat>
      <fiber unit="g">0</fiber>
    </item>
    <item>
      <name>Рис</name>
      <grams>120</grams>
      <calories unit="kcal">180</calories>
      <protein unit="g">4</protein>
      <carbs unit="g">38</carbs>
      <fat unit="g">1</fat>
      <fiber unit="g">1</fiber>
    </item>
    <item>
      <name>Салат</name>
      <grams>80</grams>
      <calories unit="kcal">90</calories>
      <protein unit="g">4</protein>
      <carbs unit="g">7</carbs>
      <fat unit="g">3</fat>
      <fiber unit="g">5</fiber>
    </item>
  </items>
</analysis>`;

export function sseFromContent(content: string): string {
  return (
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n` +
    'data: [DONE]\n\n'
  );
}
