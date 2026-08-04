export const legalConfig = {
  revisionDate: '2026-08-04',
  sellerName: 'Муталимов Камал Тагирович',
  inn: '057201730918',
  ogrnip: '325050000157903',
  email: 'kamai122000@mail.ru',
  productName: 'AI Food',
  telegramSupport: 'https://t.me/double_cumboy',
  telegramLabel: '@double_cumboy',
} as const;

export function formatSellerBlock(): string {
  const c = legalConfig;
  return `Индивидуальный предприниматель ${c.sellerName}, ИНН ${c.inn}, ОГРНИП ${c.ogrnip}, email: ${c.email}.`;
}
