import { Capacitor, registerPlugin } from '@capacitor/core';

interface TelegramSupportPlugin {
  openChatWithText(options: { username: string; text: string }): Promise<void>;
}

const TelegramSupport = registerPlugin<TelegramSupportPlugin>('TelegramSupport');

export async function openTelegramChatWithTextNative(
  username: string,
  text: string,
): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return false;
  }
  try {
    await TelegramSupport.openChatWithText({ username, text });
    return true;
  } catch {
    return false;
  }
}
