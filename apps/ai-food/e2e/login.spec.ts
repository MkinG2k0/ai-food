import { test, expect } from './fixtures/test';

test.describe('login', () => {
  test('страница входа показывает гостевой лимит и Telegram', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Настройки').click();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.getByText(/бесплатных анализов/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Войти через Telegram' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Войти (демо)' }),
    ).toBeVisible();
  });

  test('демо-вход и выход', async ({ onboardedPage: page }) => {
    await page.getByLabel('Настройки').click();
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.getByRole('button', { name: 'Войти (демо)' }).click();

    await expect(page.getByText('Вход выполнен')).toBeVisible();
    await expect(page).toHaveURL('/');

    await page.getByLabel('Настройки').click();
    await expect(page.getByText(/Демо пользователь/)).toBeVisible();
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByText('Вы вышли')).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('после login sync endpoints не ломают UI', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Настройки').click();
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.getByRole('button', { name: 'Войти (демо)' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByLabel('Добавить еду')).toBeVisible();
    await expect(page.getByText(/ошибка/i)).toHaveCount(0);
  });
});
