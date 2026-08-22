import { test, expect } from './fixtures/test';

test.describe('subscribe', () => {
  test('гость на /subscribe перенаправляется на login при оплате', async ({
    onboardedPage: page,
  }) => {
    await page.goto('/subscribe');
    await expect(page.getByRole('heading', { name: 'Подписка' })).toBeVisible();
    await expect(page.getByText(/для оплаты нужен вход/i)).toBeVisible();
    await page.getByRole('button', { name: /Получить доступ/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('промокод E2E10 применяет скидку', async ({ loggedInPage: page }) => {
    await page.goto('/subscribe');
    await expect(page.getByText('990 ₽', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Есть промокод?' }).click();
    await page.getByPlaceholder('Введите код').fill('E2E10');
    await page.getByRole('button', { name: 'Применить' }).click();

    await expect(page.getByText('Скидка 10% применена')).toBeVisible();
    await expect(page.getByRole('button', { name: /891 ₽/ })).toBeVisible();
    await expect(page.getByText('−10%')).toBeVisible();
  });

  test('mock checkout активирует лицензию на success', async ({
    loggedInPage: page,
  }) => {
    await page.goto('/subscribe');
    await page.getByRole('button', { name: 'Есть промокод?' }).click();
    await page.getByPlaceholder('Введите код').fill('E2E10');
    await page.getByRole('button', { name: 'Применить' }).click();

    await page.getByRole('button', { name: /Получить доступ/ }).click();
    await expect(page).toHaveURL(/\/subscribe\/success\?mock=1/, {
      timeout: 15_000,
    });

    await expect(page.getByText(/Годовая лицензия активна/)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('fail экран предлагает повторить оплату', async ({
    loggedInPage: page,
  }) => {
    await page.goto('/subscribe/fail');
    await expect(
      page.getByRole('heading', { name: 'Оплата не прошла' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Повторить оплату' }).click();
    await expect(page).toHaveURL('/subscribe');
  });
});
