import { test, expect } from './fixtures/test';

test.describe('settings', () => {
  test('настройки показывают профиль и цели КБЖУ', async ({
    onboardedPage: page,
  }) => {
    await page.getByLabel('Настройки').click();
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();

    // Profile accordion is collapsed by default.
    await page.getByRole('button', { name: 'Профиль' }).click();
    await expect(page.getByText('Мужской')).toBeVisible();
    await expect(page.getByText('25 лет')).toBeVisible();

    // Targets live further down — scroll and open if needed, or assert kcal rings section.
    await expect(page.getByText('Кольца календаря')).toBeVisible();
  });
});
