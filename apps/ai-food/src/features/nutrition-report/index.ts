export { NutritionReportSheet, type NutritionReportSheetProps } from './ui/NutritionReportSheet';
export { NutritionReportDocument, type NutritionReportDocumentProps } from './ui/NutritionReportDocument';
export { NutritionReportPreview, type NutritionReportPreviewProps } from './ui/NutritionReportPreview';
export {
  buildReportPeriodPresets,
  formatReportPeriodRange,
  inclusiveDayCount,
  previousCalendarWeek,
  reportFileName,
  rollingDaysEndingToday,
  type ReportPeriod,
} from './model/reportPeriods';
export {
  buildNutritionReportData,
  type NutritionReportData,
  type ReportDayEntry,
  type ReportSummary,
} from './model/buildReportData';
export {
  buildNutritionReportSnapshot,
  canSharePdf,
} from './model/buildNutritionReportSnapshot';
export { exportReportPdfFromElement } from './model/exportReportPdfFromElement';
export {
  NutritionReportError,
  saveNutritionReportPdf,
  shareNutritionReportPdf,
} from './model/saveNutritionReportPdf';
