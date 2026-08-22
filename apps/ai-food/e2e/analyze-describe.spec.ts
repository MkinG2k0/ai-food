import { test, expect } from './fixtures/test';
import { buildOnboardedStorage } from './fixtures/seed';
import { getCapturedAnalyzeBodies } from './fixtures/gateway-mock';

test.describe('analyze describe', () => {
  test('описание еды создаёт приём через мок /v1/food/analyze', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Описать' }).click();

    await expect(page.getByRole('heading', { name: 'Описать' })).toBeVisible();
    await page
      .getByPlaceholder('Напр.: куриный салат с рисом')
      .fill('куриный салат с рисом');
    await page.getByRole('button', { name: 'Отправить' }).click();

    await expect(
      page.getByText('Куриный салат с рисом').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('кастом-инструкции попадают в тело analyze', async ({ page }) => {
    await page.addInitScript((data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        window.localStorage.setItem(key, value);
      }
    }, buildOnboardedStorage({ settings: { customInstructions: 'я веган' } }));

    const { mockAiGateway } = await import('./fixtures/gateway-mock');
    await mockAiGateway(page);
    await page.goto('/');
    await expect(page.getByLabel('Добавить еду')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Описать' }).click();
    await page
      .getByPlaceholder('Напр.: куриный салат с рисом')
      .fill('салат');
    await page.getByRole('button', { name: 'Отправить' }).click();

    await expect.poll(() => getCapturedAnalyzeBodies().length).toBeGreaterThan(0);
    const body = getCapturedAnalyzeBodies().at(-1) as {
      customInstructions?: string;
    };
    expect(body.customInstructions).toBe('я веган');
  });
});
