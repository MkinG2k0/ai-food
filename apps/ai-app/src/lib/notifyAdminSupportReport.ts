import { sendMessage } from './telegramBotApi.js';
import type { SupportReportType } from './supportReport.js';

const TYPE_LABELS: Record<SupportReportType, string> = {
  bug: 'Ошибка',
  feature: 'Предложение',
  question: 'Вопрос',
  other: 'Другое',
};

const MESSAGE_PREVIEW_MAX = 280;

export function parseAdminTelegramChatIds(
  raw: string | undefined = process.env.ADMIN_TELEGRAM_CHAT_ID,
): number[] {
  if (!raw?.trim()) return [];
  const ids: number[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    if (!part) continue;
    const n = Number(part);
    if (Number.isFinite(n)) ids.push(n);
  }
  return ids;
}

function truncateMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MESSAGE_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, MESSAGE_PREVIEW_MAX - 1)}…`;
}

function formatReporterLabel(input: {
  userId: string | null;
  deviceId: string | null;
  userDisplayName?: string | null;
}): string {
  if (input.userDisplayName?.trim()) return input.userDisplayName.trim();
  if (input.userId) return `user ${input.userId}`;
  if (input.deviceId) {
    const short =
      input.deviceId.length > 12
        ? `${input.deviceId.slice(0, 8)}…`
        : input.deviceId;
    return `Гость · ${short}`;
  }
  return 'Неизвестный';
}

export function buildSupportReportAdminMessage(input: {
  id: string;
  type: SupportReportType;
  message: string;
  platform: string | null;
  appVersion: string | null;
  imageCount: number;
  userId: string | null;
  deviceId: string | null;
  userDisplayName?: string | null;
}): string {
  const typeLabel = TYPE_LABELS[input.type] ?? input.type;
  const reporter = formatReporterLabel(input);
  const platformBits = [input.platform, input.appVersion].filter(Boolean);
  const meta: string[] = [];
  if (platformBits.length) meta.push(platformBits.join('-'));
  if (input.imageCount > 0) {
    meta.push(
      input.imageCount === 1 ? '1 фото' : `${input.imageCount} фото`,
    );
  }

  const lines = [
    `Новое обращение: ${typeLabel}`,
    reporter,
    ...(meta.length ? [meta.join(' · ')] : []),
    '',
    truncateMessage(input.message),
  ];

  const adminBase = process.env.PUBLIC_ADMIN_URL?.trim().replace(/\/$/, '');
  if (adminBase) {
    lines.push('', `${adminBase}/admin/support-reports`);
  }

  return lines.join('\n');
}

/** Fire-and-forget Telegram alert; no-op if ADMIN_TELEGRAM_CHAT_ID unset. */
export async function notifyAdminNewSupportReport(input: {
  id: string;
  type: SupportReportType;
  message: string;
  platform: string | null;
  appVersion: string | null;
  imageCount: number;
  userId: string | null;
  deviceId: string | null;
  userDisplayName?: string | null;
}): Promise<void> {
  const chatIds = parseAdminTelegramChatIds();
  if (chatIds.length === 0) return;

  const text = buildSupportReportAdminMessage(input);
  await Promise.all(
    chatIds.map((chatId) =>
      sendMessage(chatId, text).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[support-reports] Telegram notify failed (chat ${chatId}):`,
          message,
        );
      }),
    ),
  );
}
