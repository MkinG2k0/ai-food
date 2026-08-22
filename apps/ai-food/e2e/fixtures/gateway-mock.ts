import type { Page, Route } from '@playwright/test';

import { MOCK_ANALYZE_XML, sseFromContent } from './seed';



const GATEWAY =

  process.env.VITE_AI_GATEWAY_URL?.replace(/\/$/, '') ??

  'http://127.0.0.1:3000';



export const E2E_DEMO_TOKEN = 'e2e-demo-token';



export const DEMO_GATEWAY_USER = {

  id: 'user-demo',

  telegramId: '100000001',

  username: 'demo_user',

  firstName: 'Демо',

  lastName: 'пользователь',

  photoUrl: null,

  name: 'Демо пользователь',

  dataConsentAt: '2026-08-22T00:00:00.000Z',

  dataConsentVersion: '1',

  nutritionProfile: null,

};



export type AnalyzeMockMode =
  | 'success'
  | 'error429'
  | 'error500'
  | 'invalidInput'
  | 'quota402';



export type GatewayMockState = {

  analyzeMode: AnalyzeMockMode;

  analyzeXml: string;

  subscriptionActive: boolean;

  capturedAnalyzeBodies: unknown[];

};



const defaultState = (): GatewayMockState => ({

  analyzeMode: 'success',

  analyzeXml: MOCK_ANALYZE_XML,

  subscriptionActive: false,

  capturedAnalyzeBodies: [],

});



let state = defaultState();



export function resetGatewayMockState(): void {

  state = defaultState();

}



export function configureGatewayMock(

  patch: Partial<Omit<GatewayMockState, 'capturedAnalyzeBodies'>>,

): void {

  Object.assign(state, patch);

}



export function getCapturedAnalyzeBodies(): unknown[] {

  return [...state.capturedAnalyzeBodies];

}



function isGateway(url: string): boolean {

  return url.startsWith(GATEWAY);

}



function userTokenFrom(route: Route): string | null {

  const headers = route.request().headers();

  return headers['x-user-token'] ?? headers['X-User-Token'] ?? null;

}



function json(route: Route, status: number, body: unknown): Promise<void> {

  return route.fulfill({

    status,

    contentType: 'application/json',

    body: JSON.stringify(body),

  });

}



async function fulfillAnalyzeWithMode(
  route: Route,
  mode: AnalyzeMockMode,
): Promise<void> {
  const postData = route.request().postData();

  if (postData) {
    try {
      state.capturedAnalyzeBodies.push(JSON.parse(postData));
    } catch {
      state.capturedAnalyzeBodies.push(postData);
    }
  }

  if (mode === 'quota402') {
    await json(route, 402, {
      code: 'QUOTA_EXCEEDED',
      message: 'Лимит бесплатных генераций исчерпан.',
      status: 402,
    });
    return;
  }

  if (mode === 'error429') {
    await json(route, 429, {
      code: 'RATE_LIMITED',
      message: 'Слишком много запросов',
      status: 429,
    });
    return;
  }

  if (mode === 'error500') {
    await json(route, 500, {
      code: 'ANALYSIS_FAILED',
      message: 'Внутренняя ошибка сервера',
      status: 500,
    });
    return;
  }

  if (mode === 'invalidInput') {
    await json(route, 400, {
      code: 'INVALID_INPUT',
      message: 'Укажите фото или описание еды.',
      status: 400,
    });
    return;
  }

  await route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'X-Analyze-Job-Id': 'e2e-job-1',
    },
    body: sseFromContent(state.analyzeXml),
  });
}

async function fulfillAnalyze(route: Route): Promise<void> {
  await fulfillAnalyzeWithMode(route, state.analyzeMode);
}

/** Page-scoped analyze override — closure mode avoids global state races in parallel workers. */
export async function overrideAnalyzeRoute(
  page: Page,
  mode: AnalyzeMockMode,
): Promise<void> {
  await page.route(`${GATEWAY}/v1/food/analyze`, async (route) => {
    await fulfillAnalyzeWithMode(route, mode);
  });
}

/**
 * Intercept AI gateway network only (host-scoped) so Vite module URLs

 * like `/src/features/auth/...` are never swallowed by wildcards.

 */

export async function mockAiGateway(page: Page): Promise<void> {

  resetGatewayMockState();



  await page.route(`${GATEWAY}/**`, async (route) => {

    const url = route.request().url();

    const method = route.request().method();



    if (!isGateway(url)) {

      await route.continue();

      return;

    }



    if (url.includes('/v1/food/analyze')) {

      await fulfillAnalyze(route);

      return;

    }



    if (url.includes('/v1/food/refine')) {
      const refinePayload = {
        foodName: 'Куриный салат с рисом',
        calories: 520,
        protein: 38,
        carbs: 45,
        fat: 18,
        fiber: 6,
        items: [],
      };
      await json(route, 200, {
        choices: [{ message: { content: JSON.stringify(refinePayload) } }],
      });
      return;
    }



    if (url.includes('/v1/food/ask')) {

      await json(route, 200, { answer: 'E2E mock answer' });

      return;

    }



    if (url.includes('/v1/chat/completions')) {

      await json(route, 503, { error: 'e2e mocked unavailable' });

      return;

    }



    if (url.includes('/usage')) {

      await json(route, 200, {

        freeGenerationLimit: 50,

        authLoginGenerationBonus: 100,

        used: 0,

        remaining: 50,

      });

      return;

    }



    if (url.includes('/auth/demo/login') && method === 'POST') {

      await json(route, 200, {

        token: E2E_DEMO_TOKEN,

        user: DEMO_GATEWAY_USER,

      });

      return;

    }



    if (url.includes('/auth/me') && method === 'GET') {

      const token = userTokenFrom(route);

      if (!token || token !== E2E_DEMO_TOKEN) {

        await json(route, 401, { error: 'unauthorized' });

        return;

      }

      await json(route, 200, { user: DEMO_GATEWAY_USER });

      return;

    }



    if (url.includes('/user/friends/requests') && method === 'GET') {
      const token = userTokenFrom(route);
      if (!token || token !== E2E_DEMO_TOKEN) {
        await json(route, 401, { error: 'unauthorized' });
        return;
      }
      await json(route, 200, { incoming: [], outgoing: [] });
      return;
    }

    if (
      url.includes('/user/friends') &&
      !url.includes('/requests') &&
      !url.includes('/profile') &&
      method === 'GET'
    ) {
      const token = userTokenFrom(route);
      if (!token || token !== E2E_DEMO_TOKEN) {
        await json(route, 401, { error: 'unauthorized' });
        return;
      }
      await json(route, 200, { friends: [] });
      return;
    }

    if (url.includes('/user/')) {

      const token = userTokenFrom(route);

      if (method === 'GET') {

        if (!token || token !== E2E_DEMO_TOKEN) {

          await json(route, 401, { error: 'unauthorized' });

          return;

        }

        await json(route, 200, {

          meals: [],

          weights: [],

          favorites: [],

          settings: null,

          streak: null,

          nutritionProfile: null,

          deletedIds: [],

          serverTime: new Date().toISOString(),

        });

        return;

      }

      if (!token || token !== E2E_DEMO_TOKEN) {

        await json(route, 401, { error: 'unauthorized' });

        return;

      }

      await json(route, 200, { ok: true });

      return;

    }



    if (url.includes('/billing/price') && method === 'GET') {

      await json(route, 200, {

        amountKopecks: 99000,

        currency: 'RUB',

        durationDays: 365,

      });

      return;

    }



    if (url.includes('/billing/promo/validate') && method === 'POST') {

      const token = userTokenFrom(route);

      if (!token) {

        await json(route, 401, { message: 'Unauthorized', code: 'UNAUTHORIZED' });

        return;

      }

      let promoCode = '';

      try {

        promoCode = String(

          JSON.parse(route.request().postData() ?? '{}').promoCode ?? '',

        ).trim();

      } catch {

        promoCode = '';

      }

      if (promoCode.toUpperCase() !== 'E2E10') {

        await json(route, 400, {

          message: 'Неверный промокод',

          code: 'INVALID_PROMO',

        });

        return;

      }

      await json(route, 200, {

        valid: true,

        code: 'E2E10',

        discountPercent: 10,

        originalAmount: 99000,

        finalAmount: 89100,

      });

      return;

    }



    if (url.includes('/billing/subscribe') && method === 'POST') {

      const token = userTokenFrom(route);

      if (!token) {

        await json(route, 401, { message: 'Unauthorized', code: 'UNAUTHORIZED' });

        return;

      }

      await json(route, 200, {

        paymentUrl: '/subscribe/success?mock=1&paymentId=e2e-pay-1',

        paymentId: 'e2e-pay-1',

        amount: 89100,

        originalAmount: 99000,

        promoCode: 'E2E10',

      });

      return;

    }



    if (url.includes('/billing/status') && method === 'GET') {

      const token = userTokenFrom(route);

      if (!token) {

        await json(route, 401, { message: 'Unauthorized', code: 'UNAUTHORIZED' });

        return;

      }

      await json(route, 200, {

        subscriptionStatus: state.subscriptionActive ? 'active' : 'none',

        subscriptionExpiresAt: state.subscriptionActive

          ? '2027-08-22T00:00:00.000Z'

          : null,

        hasActiveSubscription: state.subscriptionActive,

        latestPayment: null,

      });

      return;

    }



    if (url.includes('/billing/sync') && method === 'POST') {

      const token = userTokenFrom(route);

      if (!token) {

        await json(route, 401, { message: 'Unauthorized', code: 'UNAUTHORIZED' });

        return;

      }

      state.subscriptionActive = true;

      await json(route, 200, {

        paymentId: 'e2e-pay-1',

        paymentStatus: 'paid',

        hasActiveSubscription: true,

        subscriptionExpiresAt: '2027-08-22T00:00:00.000Z',

        subscriptionStatus: 'active',

      });

      return;

    }



    if (url.includes('/auth/')) {

      await json(route, 401, { error: 'unauthorized' });

      return;

    }



    await json(route, 404, { error: 'e2e unmocked gateway path' });

  });

}



/** Override analyze SSE payload for a single test run. */

export async function mockAnalyzeWithXml(

  page: Page,

  xml: string,

): Promise<void> {

  configureGatewayMock({ analyzeXml: xml, analyzeMode: 'success' });

  await mockAiGateway(page);

}



/** Set analyze endpoint to return HTTP error without re-registering routes. */

export function setAnalyzeMockMode(mode: AnalyzeMockMode): void {

  configureGatewayMock({ analyzeMode: mode });

}



/** Activate subscription in billing/status after mock checkout sync. */

export function activateMockSubscription(): void {

  configureGatewayMock({ subscriptionActive: true });

}


