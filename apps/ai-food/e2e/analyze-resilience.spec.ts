import type { Page } from '@playwright/test';
import {
  dismissBlockingSheets,
  expect,
  test,
  waitForHome,
} from './fixtures/test';
import {
  getCapturedAnalyzeBodies,
  holdNextAnalyzeRoute,
  overrideAnalyzeJobRoute,
  overrideAnalyzeRoute,
} from './fixtures/gateway-mock';
import {
  clearNetworkOverrides,
  throttleSlow3G,
} from './fixtures/network';
import { persistEnvelope } from './fixtures/seed';

const READY_MEAL_NAME = 'Куриный салат с рисом';

async function submitDescription(page: Page, description = 'куриный салат с рисом') {
  await dismissBlockingSheets(page);
  await page.getByLabel('Добавить еду').click();
  await page.getByRole('button', { name: 'Описать' }).click();
  await expect(page.getByRole('heading', { name: 'Описать' })).toBeVisible();
  await page
    .getByPlaceholder('Напр.: куриный салат с рисом')
    .fill(description);
  await page.getByRole('button', { name: 'Отправить' }).click();
}

test.describe('analyze resilience', () => {
  test('E1: зависший анализ показывает stale Retry', async ({
    onboardedPage: page,
  }) => {
    test.setTimeout(50_000);
    await overrideAnalyzeRoute(page, 'hang');
    await submitDescription(page);

    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('E2: Retry после ошибки завершает анализ', async ({
    onboardedPage: page,
  }) => {
    await overrideAnalyzeRoute(page, 'failThenSuccess');
    await submitDescription(page);

    const retry = page.getByRole('button', { name: 'Повторить' });
    await expect(retry).toBeVisible({ timeout: 10_000 });
    await retry.click();

    await expect(page.getByText(READY_MEAL_NAME).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(() => getCapturedAnalyzeBodies().length)
      .toBeGreaterThanOrEqual(2);
  });

  test('E3: обрыв сети во время анализа восстанавливается через Retry', async ({
    onboardedPage: page,
  }) => {
    test.setTimeout(55_000);
    const heldAnalyze = await holdNextAnalyzeRoute(page);
    await submitDescription(page);
    await heldAnalyze.waitForRequest();
    expect(getCapturedAnalyzeBodies()).toHaveLength(1);

    await heldAnalyze.abort();

    const retry = page.getByRole('button', { name: 'Повторить' });
    const ready = page.getByText(READY_MEAL_NAME).first();
    await expect(retry).toBeVisible({ timeout: 30_000 });

    await heldAnalyze.uninstall();
    await overrideAnalyzeRoute(page, 'success');
    await retry.click();
    await expect(ready).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => getCapturedAnalyzeBodies().length)
      .toBeGreaterThanOrEqual(2);
  });

  test('E4: Slow 3G анализ завершается успешно', async ({
    onboardedPage: page,
  }) => {
    test.setTimeout(75_000);
    await overrideAnalyzeRoute(page, 'success');
    await throttleSlow3G(page);
    try {
      await submitDescription(page);
      await expect(page.getByText(READY_MEAL_NAME).first()).toBeVisible({
        timeout: 60_000,
      });
    } finally {
      await clearNetworkOverrides(page);
    }
  });

  test('E5: перезагрузка во время анализа восстанавливает карточку', async ({
    onboardedPage: page,
  }) => {
    test.setTimeout(45_000);
    const jobId = 'e2e-job-reload';
    const pendingMeal = {
      id: 'e2e-meal-reload',
      timestamp: new Date().toISOString(),
      name: 'Анализ…',
      status: 'analyzing',
      analyzeJobId: jobId,
      totalCalories: 0,
      items: [
        {
          id: 'e2e-meal-reload-item',
          name: 'Анализ…',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          grams: 100,
        },
      ],
    };
    const diary = persistEnvelope({ meals: [pendingMeal], pendingDeletes: [] });
    await page.evaluate((value) => {
      window.localStorage.setItem('ai-food-diary', value);
      window.localStorage.setItem('CapacitorStorage.ai-food-diary', value);
    }, diary);
    await overrideAnalyzeJobRoute(page, jobId);
    await page.reload();
    await waitForHome(page);

    const ready = page.getByText(READY_MEAL_NAME).first();
    await expect(ready).toBeVisible({ timeout: 15_000 });
  });

  test('E6: ANALYSIS_TIMEOUT показывает Retry немедленно', async ({
    onboardedPage: page,
  }) => {
    await overrideAnalyzeRoute(page, 'timeoutError');
    const startedAt = Date.now();
    await submitDescription(page);

    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible({
      timeout: 10_000,
    });
    expect(Date.now() - startedAt).toBeLessThan(20_000);
  });

  test('E7: INVALID_INPUT по-прежнему показывает Retry', async ({
    onboardedPage: page,
  }) => {
    await overrideAnalyzeRoute(page, 'invalidInput');
    await submitDescription(page, 'суп');

    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible({
      timeout: 10_000,
    });
  });
});
