import { test, expect } from './fixtures/test';

test.describe('diary meal', () => {
  test('засеянный приём виден в дневнике и открывается', async ({
    diaryPage: page,
  }) => {
    await expect(page.getByText('Овсянка с ягодами')).toBeVisible();

    await page.getByRole('button', { name: /Овсянка с ягодами/ }).click();
    await expect(page).toHaveURL(/\/meal\/e2e-meal-1/);
    await expect(
      page.getByRole('heading', { name: 'Овсянка с ягодами' }),
    ).toBeVisible();
    await expect(page.getByText('Овсянка', { exact: true })).toBeVisible();
    await expect(page.getByText('Ягоды', { exact: true })).toBeVisible();
  });
});
