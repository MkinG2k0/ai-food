import { describe, expect, it } from 'vitest';
import {
  buildSupportTelegramNativeUrl,
  buildSupportTelegramWebUrl,
  trimTextForTelegramDraft,
} from './supportTelegram';

describe('supportTelegram', () => {
  it('builds web url with encoded draft text', () => {
    expect(buildSupportTelegramWebUrl('hello world')).toBe(
      'https://t.me/mk_dag?text=hello%20world',
    );
  });

  it('builds native tg:// url with domain and draft text', () => {
    expect(buildSupportTelegramNativeUrl('line1\nline2')).toBe(
      'tg://resolve?domain=mk_dag&text=line1%0Aline2',
    );
  });

  it('truncates overly long drafts', () => {
    const long = 'a'.repeat(4000);
    const trimmed = trimTextForTelegramDraft(long);
    expect(trimmed.length).toBeLessThan(long.length);
    expect(trimmed).toContain('обрезано');
  });
});
