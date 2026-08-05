import { landingConfig } from '@/lib/landing/config';

const fallbackSiteUrl = 'http://localhost:3001';

function withHttps(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function resolveSiteUrl(): string {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return withHttps(vercelUrl);

  return fallbackSiteUrl;
}

export const siteConfig = {
  name: landingConfig.productName,
  tagline: 'Калории и БЖУ по фото',
  description:
    'AI Food анализирует еду по фото: калории, белки, жиры и углеводы за секунды. Дневник питания, веб и RuStore.',
  locale: 'ru_RU',
  language: 'ru',
  themeColor: '#1a2f23',
  keywords: [
    'AI Food',
    'подсчёт калорий по фото',
    'КБЖУ',
    'БЖУ',
    'дневник питания',
    'калории по фото',
    'учёт еды ИИ',
    'анализ тарелки',
  ],
  webAppUrl: landingConfig.webAppUrl,
  ruStoreUrl: landingConfig.ruStoreUrl,
  get siteUrl() {
    return resolveSiteUrl();
  },
} as const;

export function absoluteUrl(path = '/'): string {
  const base = siteConfig.siteUrl;
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
