export interface LimitGalleryMealFilesOptions {
  max: number;
  /** `null` = unlimited; do not quota-truncate */
  remaining: number | null;
}

export interface LimitGalleryMealFilesResult {
  files: File[];
  truncatedByMax: boolean;
  truncatedByQuota: boolean;
  requestedCount: number;
}

export function limitGalleryMealFiles(
  files: File[],
  { max, remaining }: LimitGalleryMealFilesOptions,
): LimitGalleryMealFilesResult {
  const requestedCount = files.length;
  const truncatedByMax = requestedCount > max;
  const afterMax = files.slice(0, Math.max(0, max));

  if (remaining === null) {
    return {
      files: afterMax,
      truncatedByMax,
      truncatedByQuota: false,
      requestedCount,
    };
  }

  const capped = Math.max(0, remaining);
  const truncatedByQuota = afterMax.length > capped;
  return {
    files: afterMax.slice(0, capped),
    truncatedByMax,
    truncatedByQuota,
    requestedCount,
  };
}