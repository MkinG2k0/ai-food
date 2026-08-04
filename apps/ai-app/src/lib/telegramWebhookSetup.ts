import { getTelegramBotToken, setWebhook } from './telegramBotApi.js';

export async function setupTelegramWebhook(): Promise<void> {
  const token = getTelegramBotToken();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const baseUrl = process.env.PUBLIC_GATEWAY_URL?.trim().replace(/\/$/, '');

  if (!token || !secret || !baseUrl) {
    console.log(
      'Telegram webhook setup skipped (need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_GATEWAY_URL)',
    );
    return;
  }

  const url = `${baseUrl}/telegram/webhook`;
  await setWebhook({ url, secretToken: secret });
  console.log(`Telegram webhook set to ${url}`);
}
