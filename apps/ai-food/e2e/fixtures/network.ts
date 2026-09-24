import type { CDPSession, Page } from '@playwright/test';

const sessions = new WeakMap<Page, CDPSession>();

async function networkSession(page: Page): Promise<CDPSession> {
  const existing = sessions.get(page);
  if (existing) return existing;

  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  sessions.set(page, session);
  return session;
}

export async function setOffline(
  page: Page,
  offline: boolean,
): Promise<void> {
  await page.context().setOffline(offline);
}

export async function throttleSlow3G(page: Page): Promise<void> {
  const session = await networkSession(page);
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
  });
}

export async function clearNetworkOverrides(page: Page): Promise<void> {
  await page.context().setOffline(false);

  const session = sessions.get(page);
  if (!session) return;

  // CDP fields: offline, latency, downloadThroughput, uploadThroughput.
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
}
