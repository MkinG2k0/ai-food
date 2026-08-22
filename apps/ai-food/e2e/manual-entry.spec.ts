import { test, expect } from './fixtures/test';

test.describe('manual entry', () => {
  test('ручной ввод сохраняет приём и открывает детали', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Добавить еду').click();
    await page.getByRole('button', { name: 'Вручную' }).click();

    await expect(page.getByRole('heading', { name: 'Вручную' })).toBeVisible();

    await page.getByLabel('Название').fill('Тестовая каша e2e');
    await page.getByLabel('Ккал').fill('350');
    await page.getByLabel('Белки').fill('12');
    await page.getByLabel('Углеводы').fill('55');
    await page.getByLabel('Жиры').fill('8');
    await page.getByLabel('Клетчатка').fill('5');
    await page.getByLabel('Граммы').fill('250');

    await page.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page).toHaveURL(/\/meal\//, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: 'Тестовая каша e2e' }),
    ).toBeVisible();
  });
});
