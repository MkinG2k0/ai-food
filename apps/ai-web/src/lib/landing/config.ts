export const landingConfig = {
  productName: 'AI Food',
  webAppUrl: 'https://ai-food-mobile.vercel.app',
  ruStoreUrl: 'https://www.rustore.ru/catalog/app/com.aifood.app',
  guestFreeLimit: 50,
  authTotalLimit: 150,
  nav: [
    { href: '/#how', label: 'Как работает' },
    { href: '/#features', label: 'Возможности' },
    { href: '/#pricing', label: 'Тариф' },
    { href: '/#faq', label: 'FAQ' },
  ],
} as const;

export type LandingNavItem = (typeof landingConfig.nav)[number];
