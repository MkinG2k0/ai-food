/** Draw video into canvas with object-fit: cover. */
export function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0 || canvasWidth <= 0 || canvasHeight <= 0) return;

  const scale = Math.max(canvasWidth / vw, canvasHeight / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = (canvasWidth - w) / 2;
  const y = (canvasHeight - h) / 2;
  ctx.drawImage(video as CanvasImageSource, x, y, w, h);
}
