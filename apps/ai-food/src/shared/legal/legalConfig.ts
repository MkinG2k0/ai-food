export const legalConfig = {
  revisionDate: '2026-08-04',
  sellerName: '[ФИО ИП]',
  inn: '[ИНН]',
  ogrnip: '[ОГРНИП]',
  address: '[Адрес]',
  email: '[email]',
  phone: '[телефон]',
  productName: 'AI Food',
  telegramSupport: 'https://t.me/double_cumboy',
} as const;

export function formatSellerBlock(): string {
  const c = legalConfig;
  return `Индивидуальный предприниматель ${c.sellerName}, ИНН ${c.inn}, ОГРНИП ${c.ogrnip}, адрес: ${c.address}, email: ${c.email}, телефон: ${c.phone}.`;
}
