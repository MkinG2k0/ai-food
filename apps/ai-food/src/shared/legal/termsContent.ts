import { formatSellerBlock, legalConfig } from './legalConfig';
import type { LegalSection } from './types';

export type BuildTermsSectionsOptions = {
  amountKopecks: number | null;
  durationDays: number | null;
};

function buildPriceParagraph(
  amountKopecks: number | null,
  durationDays: number | null,
): string {
  if (amountKopecks != null && durationDays != null) {
    return `Стоимость лицензии составляет ${Math.round(amountKopecks / 100)} ₽ за ${durationDays} дней. Оплата разовая, без автопродления.`;
  }
  return 'Актуальная цена и срок указаны на экране оплаты в приложении.';
}

export function buildTermsSections(
  opts: BuildTermsSectionsOptions,
): LegalSection[] {
  const { amountKopecks, durationDays } = opts;
  const { productName, email, telegramLabel } = legalConfig;

  return [
    {
      title: 'Исполнитель',
      paragraphs: [
        formatSellerBlock(),
        `Исполнитель оказывает услуги в статусе индивидуального предпринимателя и является правообладателем приложения ${productName}.`,
      ],
    },
    {
      title: 'Предмет договора',
      paragraphs: [
        `Настоящая оферта определяет условия предоставления цифровой услуги: лицензии на использование приложения ${productName} с безлимитным AI-анализом фото и описания еды, а также AI-уточнением результатов на срок действия лицензии.`,
        'Ведение дневника питания, ручной ввод блюд и сканирование штрихкодов доступны без оплаты лицензии в рамках бесплатного функционала приложения.',
      ],
    },
    {
      title: 'Цена и срок',
      paragraphs: [buildPriceParagraph(amountKopecks, durationDays)],
    },
    {
      title: 'Акцепт оферты',
      paragraphs: [
        'Оплата лицензии через платёжный сервис T‑Bank (оплата по ссылке) означает полное и безоговорочное принятие условий настоящей публичной оферты.',
      ],
    },
    {
      title: 'Предоставление доступа',
      paragraphs: [
        'После подтверждения платежа (статус CONFIRMED) лицензия активируется на указанный срок. Статус лицензии и срок действия отображаются в приложении.',
      ],
    },
    {
      title: 'Ограничение ответственности',
      paragraphs: [
        `${productName} не является медицинской услугой и не предназначен для постановки диагнозов или назначения лечения.`,
        'Оценки калорийности, БЖУ и состава блюд носят приблизительный характер и не заменяют консультацию врача, диетолога или иного специалиста.',
      ],
    },
    {
      title: 'Возврат денежных средств',
      paragraphs: [
        'При полном возврате платежа (статус REFUNDED) лицензия деактивируется автоматически.',
        'Частичный возврат возможен по согласованию с исполнителем через контакты, указанные ниже.',
      ],
    },
    {
      title: 'Претензии',
      paragraphs: [
        `Претензии по качеству услуги и работе приложения направляйте на email ${email} или в Telegram ${telegramLabel}.`,
      ],
    },
    {
      title: 'Реквизиты',
      paragraphs: [
        formatSellerBlock(),
        'При необходимости согласуйте документ с юристом перед публикацией в продакшене.',
      ],
    },
  ];
}
