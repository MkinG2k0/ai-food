import { test, expect, waitForHome, dismissBlockingSheets } from './fixtures/test';
import { mockAiGateway } from './fixtures/gateway-mock';
import { buildOnboardedStorage, sampleFavorite } from './fixtures/seed';

test.describe('favorites flow', () => {
  test('quick-add из избранного добавляет приём на главную', async ({
    page,
  }) => {
    const favorite = sampleFavorite({ name: 'Куриный салат' });
    await page.addInitScript((data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        window.localStorage.setItem(key, value);
      }
    }, buildOnboardedStorage({ favorites: [favorite] }));

    await mockAiGateway(page);
    await page.goto('/');
    await waitForHome(page);

    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Избранное' }).click();
    await expect(page.getByRole('heading', { name: 'Избранное' })).toBeVisible();
    await page.getByRole('button', { name: 'Куриный салат' }).click();
    await dismissBlockingSheets(page);
    await expect(page.getByText('Куриный салат').first()).toBeVisible();
  });

  test('toggle избранного на детальной странице', async ({
    diaryPage: page,
  }) => {
    await page.getByRole('button', { name: /Овсянка с ягодами/ }).click();
    await expect(page).toHaveURL(/\/meal\/e2e-meal-1/);

    await page.getByLabel('Добавить в избранное').click();
    await expect(page.getByText('Добавлено в избранное')).toBeVisible();
    await page.getByLabel('Убрать из избранного').click();
    await expect(page.getByText('Удалено из избранного')).toBeVisible();
  });
});
