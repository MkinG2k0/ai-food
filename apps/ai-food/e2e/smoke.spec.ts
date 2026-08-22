import {
  test,
  expect,
  dismissPwaInstallIfPresent,
  waitForBootSplashGone,
} from './fixtures/test';
import { mockAiGateway } from './fixtures/gateway-mock';

test.describe('smoke', () => {
  test('приложение стартует и показывает онбординг или PWA-экран', async ({
    page,
  }) => {
    await mockAiGateway(page);
    await page.goto('/');
    await waitForBootSplashGone(page);
    await dismissPwaInstallIfPresent(page);

    await expect(
      page.getByRole('heading', {
        name: /Ваш пол|Установить как приложение/,
      }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
