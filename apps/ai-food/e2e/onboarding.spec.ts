import {
  test,
  expect,
  dismissPwaInstallIfPresent,
  waitForBootSplashGone,
  waitForHome,
} from './fixtures/test';
import { mockAiGateway } from './fixtures/gateway-mock';
import { persistEnvelope } from './fixtures/seed';

test.describe('onboarding', () => {
  test('пропуск онбординга открывает главный экран', async ({ page }) => {
    const pwaSeen = persistEnvelope({ dismissed: true });
    const newsSeen = persistEnvelope({ lastSeenDate: '2026-08-19' });
    await page.addInitScript(
      (data: { pwaSeen: string; newsSeen: string }) => {
        window.localStorage.setItem('ai-food-pwa-install-seen', data.pwaSeen);
        window.localStorage.setItem(
          'CapacitorStorage.ai-food-pwa-install-seen',
          data.pwaSeen,
        );
        window.localStorage.setItem('ai-food-news-seen', data.newsSeen);
        window.localStorage.setItem(
          'CapacitorStorage.ai-food-news-seen',
          data.newsSeen,
        );
      },
      { pwaSeen, newsSeen },
    );

    await mockAiGateway(page);
    await page.goto('/');
    await waitForBootSplashGone(page);
    await dismissPwaInstallIfPresent(page);

    await expect(page.getByRole('heading', { name: 'Ваш пол' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Пропустить' }).click();

    await waitForHome(page);
    await expect(page.getByLabel('Статистика')).toBeVisible();
    await expect(page.getByLabel('Настройки')).toBeVisible();
  });
});
