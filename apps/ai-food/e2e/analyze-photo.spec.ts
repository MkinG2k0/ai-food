import { test, expect, waitForHome } from './fixtures/test';
import { getCapturedAnalyzeBodies, overrideAnalyzeRoute } from './fixtures/gateway-mock';
import {
  mockGetUserMedia,
  openScanPage,
  TEST_IMAGE_PATH,
  uploadFromAddFoodGallery,
} from './fixtures/photo';

async function prepareMockCamera(page: import('@playwright/test').Page) {
  await mockGetUserMedia(page);
  await page.reload();
  await waitForHome(page);
}

test.describe('analyze photo', () => {
  test('галерея 1 фото создаёт ready-приём', async ({ onboardedPage: page }) => {
    await uploadFromAddFoodGallery(page, [TEST_IMAGE_PATH]);
    await expect(
      page.getByText('Куриный салат с рисом').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('галерея 3 фото показывает badge количества', async ({
    onboardedPage: page,
  }) => {
    await uploadFromAddFoodGallery(page, [
      TEST_IMAGE_PATH,
      TEST_IMAGE_PATH,
      TEST_IMAGE_PATH,
    ]);
    await expect(
      page.getByText('Куриный салат с рисом').first(),
    ).toBeVisible({ timeout: 30_000 });
    const mealCard = page.getByRole('button', { name: /Куриный салат с рисом/ });
    await expect(
      mealCard.locator('span.absolute.bottom-1.right-1', { hasText: '3' }),
    ).toBeVisible();
  });

  test('scan: галерея без камеры возвращает на главную', async ({
    onboardedPage: page,
  }) => {
    await page.goto('/scan');
    await page.getByLabel('Выбор из галереи').setInputFiles(TEST_IMAGE_PATH);
    await expect(page).toHaveURL('/', { timeout: 30_000 });
    await expect(
      page.getByText('Куриный салат с рисом').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('scan: снимок без описания через mock камеру', async ({
    onboardedPage: page,
  }) => {
    await prepareMockCamera(page);
    await openScanPage(page);
    const shutter = page.getByRole('button', {
      name: 'Сфотографировать',
      exact: true,
    });
    await expect(shutter).toBeEnabled({ timeout: 15_000 });
    await shutter.click();
    await expect(page).toHaveURL('/', { timeout: 30_000 });
    await expect(
      page.getByText('Куриный салат с рисом').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('scan: фото + описание отправляет image и description', async ({
    onboardedPage: page,
  }) => {
    await prepareMockCamera(page);
    await openScanPage(page);
    await expect(
      page.getByLabel('Сфотографировать с описанием'),
    ).toBeEnabled({ timeout: 15_000 });
    await page.getByLabel('Сфотографировать с описанием').click();
    await expect(
      page.getByRole('heading', { name: 'Камера + Описание' }),
    ).toBeVisible();
    await page
      .getByPlaceholder('Напр.: куриный салат с рисом, без соуса')
      .fill('куриный салат с рисом');
    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page).toHaveURL('/', { timeout: 30_000 });
    await expect.poll(() => getCapturedAnalyzeBodies().length).toBeGreaterThan(0);
    const body = getCapturedAnalyzeBodies().at(-1) as {
      description?: string;
      images?: string[];
    };
    expect(body.description).toBe('куриный салат с рисом');
    expect(body.images?.length).toBeGreaterThan(0);
  });

  test('analyze error показывает карточку с retry', async ({
    onboardedPage: page,
  }) => {
    await overrideAnalyzeRoute(page, 'invalidInput');
    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Описать' }).click();
    await page.getByPlaceholder('Напр.: куриный салат с рисом').fill('суп');
    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('quota exceeded редиректит на subscribe', async ({
    loggedInPage: page,
  }) => {
    await overrideAnalyzeRoute(page, 'quota402');
    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Описать' }).click();
    await page.getByPlaceholder('Напр.: куриный салат с рисом').fill('суп');
    await page.getByRole('button', { name: 'Отправить' }).click();
    const subscribeCta = page.getByRole('button', { name: 'Оформить лицензию' });
    await expect(subscribeCta).toBeVisible({ timeout: 30_000 });
    await subscribeCta.click();
    await expect(page).toHaveURL(/\/subscribe/);
  });
});
