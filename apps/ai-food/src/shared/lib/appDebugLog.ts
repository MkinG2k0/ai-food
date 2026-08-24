import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { getAppVersion } from './appVersion';
import {
  openSupportTelegramWithText,
  trimTextForTelegramDraft,
} from './supportTelegram';

export type AppDebugCategory = 'app' | 'photo' | 'analyze' | 'meal' | 'sync';

const MAX_LINES = 200;

const buffer: string[] = [];
const listeners = new Set<() => void>();

let getDebugEnabled: () => boolean = () => false;

export function bindAppDebugEnabled(getter: () => boolean): void {
  getDebugEnabled = getter;
}

export function isAppDebugEnabled(): boolean {
  return getDebugEnabled();
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAppDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function formatExtra(extra?: Record<string, unknown>): string {
  if (!extra || Object.keys(extra).length === 0) return '';
  return (
    ' · ' +
    Object.entries(extra)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')
  );
}

function pushLine(category: AppDebugCategory, line: string): void {
  buffer.push(`${new Date().toISOString()} [${category}] ${line}`);
  if (buffer.length > MAX_LINES) {
    buffer.splice(0, buffer.length - MAX_LINES);
  }
  notifyListeners();
}

/** Core-functionality debug log — silent unless debug mode is on. */
export function appDebugLog(
  category: AppDebugCategory,
  label: string,
  ms?: number,
  extra?: Record<string, unknown>,
): void {
  if (!getDebugEnabled()) return;
  const time = ms === undefined ? '' : `: ${Math.round(ms)}ms`;
  pushLine(category, `${label}${time}${formatExtra(extra)}`);
}

export function clearAppDebugLog(): void {
  buffer.length = 0;
  notifyListeners();
}

export function buildAppDebugReport(): string {
  const env = [
    '=== AI Food debug log ===',
    `appVersion: ${getAppVersion()}`,
    `debug: ${getDebugEnabled() ? 'on' : 'off'}`,
    `time: ${new Date().toISOString()}`,
    `href: ${typeof location !== 'undefined' ? location.href : '-'}`,
    `host: ${typeof location !== 'undefined' ? location.host : '-'}`,
    `secureContext: ${typeof window !== 'undefined' ? window.isSecureContext : '-'}`,
    `getUserMedia: ${typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)}`,
    `platform: ${Capacitor.getPlatform()}`,
    `native: ${Capacitor.isNativePlatform()}`,
    `ua: ${typeof navigator !== 'undefined' ? navigator.userAgent : '-'}`,
    '--- events ---',
    ...(buffer.length > 0 ? buffer : ['(empty)']),
    '=== end ===',
  ];
  return env.join('\n');
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    return true;
  } catch (err) {
    console.warn('[app-debug] copy failed', err);
    return false;
  }
}

export async function copyAppDebugReport(): Promise<boolean> {
  const text = buildAppDebugReport();
  const ok = await copyText(text);
  if (ok) {
    toast.success(`Лог скопирован (${buffer.length} событий)`);
  } else {
    toast.error('Не удалось скопировать лог');
  }
  return ok;
}

export async function shareAppDebugReportViaTelegram(): Promise<boolean> {
  const text = buildAppDebugReport();
  const draft = trimTextForTelegramDraft(text);
  const copied = await copyText(text);
  if (!copied) {
    toast.error('Не удалось скопировать лог');
    return false;
  }

  await openSupportTelegramWithText(draft);
  toast.success('Текст вставлен в Telegram — нажмите «Отправить»');
  return true;
}
