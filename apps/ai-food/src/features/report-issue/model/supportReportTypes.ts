export const SUPPORT_REPORT_TYPES = [
  'bug',
  'feature',
  'question',
  'other',
] as const;

export type SupportReportType = (typeof SUPPORT_REPORT_TYPES)[number];

export const SUPPORT_REPORT_TYPE_LABELS: Record<SupportReportType, string> = {
  bug: 'Ошибка в приложении',
  feature: 'Предложение',
  question: 'Вопрос',
  other: 'Другое',
};

export const DEFAULT_SUPPORT_REPORT_TYPE: SupportReportType = 'bug';

export const MAX_SUPPORT_REPORT_IMAGES = 3;

export const MAX_SUPPORT_REPORT_MESSAGE_LENGTH = 4000;
