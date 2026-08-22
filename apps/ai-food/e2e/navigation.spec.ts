import { test, expect } from './fixtures/test';

test.describe('navigation', () => {
  test('главная → статистика → настройки → назад на главную', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Статистика').click();
    await expect(page.getByRole('heading', { name: 'Статистика' })).toBeVisible();

    await page.getByLabel('Назад').click();
    await expect(page.getByLabel('Добавить еду')).toBeVisible();

    await page.getByLabel('Настройки').click();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await expect(page.getByText('Профиль')).toBeVisible();

    await page.getByLabel('Назад').click();
    await expect(page.getByLabel('Добавить еду')).toBeVisible();
  });

  test('избранное открывается из листа добавления еды', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Добавить еду').click();
    await expect(page.getByRole('heading', { name: 'Добавить еду' })).toBeVisible();
    await page.getByRole('button', { name: 'Избранное' }).click();
    await expect(page.getByRole('heading', { name: 'Избранное' })).toBeVisible();
  });
});
