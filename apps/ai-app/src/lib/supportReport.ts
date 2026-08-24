import { z } from 'zod';

export const SUPPORT_REPORT_TYPES = [
  'bug',
  'feature',
  'question',
  'other',
] as const;

export type SupportReportType = (typeof SUPPORT_REPORT_TYPES)[number];

export const SUPPORT_REPORT_STATUSES = ['new', 'read', 'resolved'] as const;

export type SupportReportStatus = (typeof SUPPORT_REPORT_STATUSES)[number];

const DATA_URL_RE = /^data:image\/[\w.+-]+;base64,/i;

export const createSupportReportBodySchema = z.object({
  type: z.enum(SUPPORT_REPORT_TYPES).default('other'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required.')
    .max(4000, 'Message is too long.'),
  images: z
    .array(
      z
        .string()
        .max(2_000_000, 'Image payload is too large.')
        .refine((value) => DATA_URL_RE.test(value), 'Invalid image data URL.'),
    )
    .max(3)
    .optional()
    .default([]),
  appVersion: z.string().trim().max(64).optional(),
  platform: z.string().trim().max(32).optional(),
});

export type CreateSupportReportBody = z.infer<
  typeof createSupportReportBodySchema
>;

export function supportReportResponse(report: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  type: SupportReportType;
  message: string;
  images: unknown;
  appVersion: string | null;
  platform: string | null;
  status: SupportReportStatus;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
  } | null;
}) {
  const images = Array.isArray(report.images)
    ? report.images.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    id: report.id,
    userId: report.userId,
    deviceId: report.deviceId,
    type: report.type,
    message: report.message,
    images,
    appVersion: report.appVersion,
    platform: report.platform,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    user: report.user
      ? {
          id: report.user.id,
          telegramId: report.user.telegramId,
          username: report.user.username,
          firstName: report.user.firstName,
          lastName: report.user.lastName,
          photoUrl: report.user.photoUrl,
        }
      : null,
  };
}

export function parseSupportReportListQuery(query: Record<string, unknown>) {
  const pageRaw = Number(query.page ?? 1);
  const pageSizeRaw = Number(query.pageSize ?? 20);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1
      ? Math.min(100, Math.floor(pageSizeRaw))
      : 20;

  const statusRaw =
    typeof query.status === 'string' ? query.status.trim() : undefined;
  const status =
    statusRaw && SUPPORT_REPORT_STATUSES.includes(statusRaw as SupportReportStatus)
      ? (statusRaw as SupportReportStatus)
      : undefined;

  return { page, pageSize, status };
}
