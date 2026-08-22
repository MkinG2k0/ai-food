import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';



const __dirname = path.dirname(fileURLToPath(import.meta.url));



export const TEST_IMAGE_PATH = path.join(__dirname, 'assets', 'meal.jpg');



export async function uploadFromAddFoodGallery(

  page: Page,

  files: string[],

): Promise<void> {

  await page.getByLabel('Добавить еду').click();

  const input = page.getByLabel('Выбор из галереи (до 3 ракурсов)');

  await input.setInputFiles(
    files.map((filePath, index) => ({
      name: `meal-${index + 1}.jpg`,
      mimeType: 'image/jpeg',
      buffer: fs.readFileSync(filePath),
    })),
  );

}



/** Fake rear camera stream for ScanPage shutter / pen-flow in CI. */

export async function mockGetUserMedia(page: Page): Promise<void> {

  await page.addInitScript(() => {

    const canvas = document.createElement('canvas');

    canvas.width = 640;

    canvas.height = 480;

    const ctx = canvas.getContext('2d');

    if (ctx) {

      ctx.fillStyle = '#3d9970';

      ctx.fillRect(0, 0, 640, 480);

      ctx.fillStyle = '#ffffff';

      ctx.font = '24px sans-serif';

      ctx.fillText('E2E food', 240, 240);

    }



    const stream =

      typeof canvas.captureStream === 'function'

        ? canvas.captureStream(30)

        : null;



    if (!stream) return;



    const original = navigator.mediaDevices.getUserMedia.bind(

      navigator.mediaDevices,

    );

    navigator.mediaDevices.getUserMedia = async () => stream;



    // Keep original available for debugging if needed.

    void original;

  });

}



export async function openScanPage(page: Page): Promise<void> {

  await page.getByLabel('Добавить еду').click();

  await page.getByRole('button', { name: 'Камера / Штрихкод' }).click();

  await page.waitForURL(/\/scan/);

}


