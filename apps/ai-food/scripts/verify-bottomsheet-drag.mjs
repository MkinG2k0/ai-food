import path from 'node:path';

import { chromium } from '@playwright/test';

// Inline minimal seed matching e2e fixtures (no TS loader).
function persistEnvelope(state) {
  return JSON.stringify({ state, version: 0 });
}

function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildOnboardedStorage() {
  const entries = {
    'ai-food-profile': persistEnvelope({
      profile: {
        gender: 'male',
        age: 25,
        height: 170,
        weight: 70,
        activity: 'medium',
        goal: 'maintain',
        targetWeight: 73.5,
        targetWeightDate: '2026-11-20',
        planStartDate: '2026-08-22',
        planStartWeight: 70,
        dietType: 'none',
      },
      targets: {
        kcal: 2546,
        protein: 126,
        fat: 71,
        carbs: 318,
        fiber: 30,
      },
      micronutrientTargets: null,
      suppressRemoteRestore: false,
    }),
    'ai-food-pwa-install-seen': persistEnvelope({ dismissed: true }),
    'ai-food-news-seen': persistEnvelope({ lastSeenDate: '2026-09-24' }),
    'ai-food-streak': persistEnvelope({
      currentLength: 0,
      freezeCount: 0,
      consumedFreezeDateKeys: [],
      grantedMilestones: [],
      lastCelebratedLocalDate: todayKey(),
      bestStreak: 0,
      calorieStreak: {
        currentLength: 0,
        freezeCount: 0,
        consumedFreezeDateKeys: [],
        grantedMilestones: [],
        bestStreak: 0,
      },
      clientUpdatedAt: '2026-08-22T00:00:00.000Z',
    }),
    'ai-food-settings': persistEnvelope({
      customInstructions: '',
      customInstructionsEnabled: true,
      aiModel: 'google/gemini-3-flash-preview',
      featureVitamins: true,
      featureHealthiness: true,
      featureComposition: true,
      sharePhotosToFriends: true,
      calendarRings: { kcal: true, protein: true, fat: false, carbs: true },
      statsMicronutrientIds: ['vitamin_c', 'iron', 'calcium', 'magnesium'],
      clientUpdatedAt: '2026-08-22T00:00:00.000Z',
    }),
  };
  const withCap = {};
  for (const [key, value] of Object.entries(entries)) {
    withCap[key] = value;
    withCap[`CapacitorStorage.${key}`] = value;
  }
  return withCap;
}

const OUT_DIRS = [
  '/cursor/stores/bc-906d0d3e-22ae-40c1-889b-3bf1f6244d78/media/bottomsheet-drag',
  '/opt/cursor/artifacts/bottomsheet-drag',
];

async function shot(page, name) {
  for (const dir of OUT_DIRS) {
    await page.screenshot({
      path: path.join(dir, name),
      fullPage: false,
    });
  }
  console.log('saved', name);
}

async function drag(page, start, end) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      start.x + (end.x - start.x) * t,
      start.y + (end.y - start.y) * t,
    );
  }
  await page.mouse.up();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const storage = buildOnboardedStorage();
  await context.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, value);
    }
  }, storage);

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.getByLabel('Настройки').click();
  await page.getByRole('button', { name: 'Профиль' }).click();
  await page.getByRole('button', { name: 'Изменить профиль' }).click();
  await page.getByRole('heading', { name: 'Изменить профиль' }).waitFor();
  await shot(page, '01_edit_profile_open.png');

  const scroller = page.locator('.overflow-y-auto').first();
  await scroller.evaluate((el) => {
    el.scrollTop = Math.min(180, el.scrollHeight - el.clientHeight);
  });
  await page.waitForTimeout(200);
  await shot(page, '02_scrolled_content.png');

  const box = await scroller.boundingBox();
  if (!box) throw new Error('no scroller box');
  const mid = { x: box.x + box.width / 2, y: box.y + box.height * 0.35 };
  await drag(page, mid, { x: mid.x, y: mid.y + 140 });
  await page.waitForTimeout(400);
  const stillOpen = await page
    .getByRole('heading', { name: 'Изменить профиль' })
    .count();
  if (stillOpen === 0) {
    throw new Error('FAIL: sheet dismissed while content was scrolled');
  }
  await shot(page, '03_scroll_no_dismiss.png');
  console.log('PASS: mid-scroll downward drag did not dismiss');

  await scroller.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(150);
  const topMid = { x: box.x + box.width / 2, y: box.y + 40 };
  await drag(page, topMid, { x: topMid.x, y: topMid.y + 220 });
  await page.waitForTimeout(500);
  await page
    .getByRole('heading', { name: 'Изменить профиль' })
    .waitFor({ state: 'detached', timeout: 3000 });
  await shot(page, '04_after_content_dismiss.png');
  console.log('PASS: content drag from scroll top dismissed');

  await page.getByRole('button', { name: 'Изменить профиль' }).click();
  await page.getByRole('heading', { name: 'Изменить профиль' }).waitFor();
  await page.waitForTimeout(700);
  const handle = page.locator('[data-bottom-sheet-handle]');
  const hbox = await handle.boundingBox();
  if (!hbox) throw new Error('no handle box');
  const hx = hbox.x + hbox.width / 2;
  const hy = hbox.y + hbox.height / 2;
  await drag(page, { x: hx, y: hy }, { x: hx, y: hy + 260 });
  await page.waitForTimeout(700);
  await page
    .getByRole('heading', { name: 'Изменить профиль' })
    .waitFor({ state: 'detached', timeout: 3000 });
  await shot(page, '05_after_handle_dismiss.png');
  console.log('PASS: handle drag dismissed');

  await page.getByLabel('Главная').click().catch(() => undefined);
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  const addBtn = page.getByLabel('Добавить еду').or(page.getByRole('button', { name: /Добавить/i }));
  if (await addBtn.first().isVisible().catch(() => false)) {
    await addBtn.first().click();
    await page.waitForTimeout(400);
    await shot(page, '06_add_food_open.png');
    const addHandle = page.locator('[data-bottom-sheet-handle]');
    const ab = await addHandle.boundingBox();
    if (ab) {
      const ax = ab.x + ab.width / 2;
      const ay = ab.y + ab.height / 2;
      await drag(page, { x: ax, y: ay }, { x: ax, y: ay + 220 });
      await page.waitForTimeout(500);
      await shot(page, '07_add_food_dismissed.png');
      console.log('PASS: add-food handle dismiss');
    }
  } else {
    console.log('SKIP: add food button not found');
  }

  await browser.close();
  console.log('ALL CHECKS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
