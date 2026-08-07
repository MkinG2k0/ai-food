export interface CaptureVideoFrameOptions {
  /** Longest edge in px. Defaults to full video size when omitted. */
  maxSide?: number;
  quality?: number;
}

/**
 * Grab current video frame as a JPEG File.
 * Optionally downscale longest edge (faster on mobile WebView).
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  options?: CaptureVideoFrameOptions,
): Promise<File | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return Promise.resolve(null);

  const maxSide = options?.maxSide;
  const longest = Math.max(width, height);
  const scale =
    maxSide && longest > maxSide ? maxSide / longest : 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const quality = options?.quality ?? 0.92;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, targetW, targetH);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(
          new File([blob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        );
      },
      'image/jpeg',
      quality,
    );
  });
}
