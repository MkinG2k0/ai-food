export interface CaptureVideoFrameOptions {
  /** Longest edge in px. Defaults to full video size when omitted. */
  maxSide?: number;
  quality?: number;
}

/**
 * Copy the current video frame onto an offscreen canvas (sync, ~1ms).
 * JPEG encode is separate so the shutter can leave the page first.
 */
export function snapshotVideoFrame(
  video: HTMLVideoElement,
  options?: Pick<CaptureVideoFrameOptions, 'maxSide'>,
): HTMLCanvasElement | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const maxSide = options?.maxSide;
  const longest = Math.max(width, height);
  const scale =
    maxSide && longest > maxSide ? maxSide / longest : 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, targetW, targetH);
  return canvas;
}

export function jpegFileFromCanvas(
  canvas: HTMLCanvasElement,
  quality = 0.92,
): Promise<File | null> {
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

/** Prime JPEG encoder so the first shutter toBlob is not a cold stall on WebView. */
export function warmJpegEncoder(): void {
  const run = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    void canvas.toBlob(() => undefined, 'image/jpeg', 0.92);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run);
  } else {
    requestAnimationFrame(run);
  }
}

/**
 * Grab current video frame as a JPEG File.
 * Optionally downscale longest edge (faster on mobile WebView).
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  options?: CaptureVideoFrameOptions,
): Promise<File | null> {
  const canvas = snapshotVideoFrame(video, options);
  if (!canvas) return Promise.resolve(null);
  return jpegFileFromCanvas(canvas, options?.quality ?? 0.92);
}
