import { test as base, expect, type Page } from '@playwright/test';
import { mockAiGateway } from './gateway-mock';
import {
  buildLoggedInStorage,
  buildOnboardedStorage,
  sampleMealWithItems,
  sampleReadyMeal,
} from './seed';

type Fixtures = {
  /** Fresh guest with completed onboarding (and news/PWA dismissed). */
  onboardedPage: Page;
  /** Onboarded + one ready meal in diary. */
  diaryPage: Page;
  /** Onboarded + demo auth in storage. */
  loggedInPage: Page;
  /** Diary meal with composition editing enabled. */
  editableMealPage: Page;
};

async function seedLocalStorage(
  page: Page,
  entries: Record<string, string>,
): Promise<void> {
  await page.addInitScript((data: Record<string, string>) => {
    for (const [key, value] of Object.entries(data)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);
}

/** BootSplash renders children under a z-[100] overlay — wait until it unmounts. */
export async function waitForBootSplashGone(page: Page): Promise<void> {
  await expect(page.locator('div.fixed.inset-0.z-\\[100\\]')).toHaveCount(0, {
    timeout: 20_000,
  });
}

export async function dismissNewsSheetIfPresent(page: Page): Promise<void> {
  const gotIt = page.getByRole('button', { name: 'Понятно' });
  try {
    await gotIt.waitFor({ state: 'visible', timeout: 3_000 });
    await gotIt.click();
    await expect(gotIt).toBeHidden({ timeout: 5_000 });
  } catch {
    // Sheet not shown — ok.
  }
}

/** Close bottom sheets (news / streak celebration) that block the FAB. */
export async function dismissBlockingSheets(page: Page): Promise<void> {
  await dismissNewsSheetIfPresent(page);
  for (let i = 0; i < 3; i++) {
    const sheet = page.locator('div.fixed.inset-0.z-50');
    if ((await sheet.count()) === 0) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
}

export async function dismissPwaInstallIfPresent(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Пропустить' });
  const installHeading = page.getByRole('heading', {
    name: /Установить как приложение|Установка|Готово/,
  });
  try {
    await installHeading.waitFor({ state: 'visible', timeout: 3_000 });
    await skip.click();
  } catch {
    // Not on PWA screen.
  }
}

export async function waitForHome(page: Page): Promise<void> {
  await waitForBootSplashGone(page);
  await dismissBlockingSheets(page);
  await expect(page.getByLabel('Добавить еду')).toBeVisible({ timeout: 30_000 });
  await dismissBlockingSheets(page);
}

async function openHome(page: Page): Promise<void> {
  await mockAiGateway(page);
  await page.goto('/');
  await waitForHome(page);
}

export const test = base.extend<Fixtures>({
  onboardedPage: async ({ page }, use) => {
    await seedLocalStorage(page, buildOnboardedStorage());
    await openHome(page);
    await use(page);
  },

  diaryPage: async ({ page }, use) => {
    await seedLocalStorage(
      page,
      buildOnboardedStorage({
        meals: [sampleReadyMeal()],
      }),
    );
    await openHome(page);
    await use(page);
  },

  loggedInPage: async ({ page }, use) => {
    await seedLocalStorage(page, buildLoggedInStorage());
    await openHome(page);
    await use(page);
  },

  editableMealPage: async ({ page }, use) => {
    await seedLocalStorage(
      page,
      buildOnboardedStorage({
        meals: [sampleMealWithItems()],
        settings: { featureComposition: true },
      }),
    );
    await openHome(page);
    await use(page);
  },
});

export { expect };
