/** Draw video into canvas with object-fit: contain (full FOV, letterbox if needed). */
export function drawVideoContain(
  ctx: CanvasRenderingContext2D,
  video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0 || canvasWidth <= 0 || canvasHeight <= 0) return;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const scale = Math.min(canvasWidth / vw, canvasHeight / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = (canvasWidth - w) / 2;
  const y = (canvasHeight - h) / 2;
  ctx.drawImage(video as CanvasImageSource, x, y, w, h);
}
