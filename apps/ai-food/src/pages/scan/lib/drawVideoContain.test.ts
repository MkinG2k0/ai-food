import { describe, expect, it, vi } from 'vitest';
import { drawVideoContain } from './drawVideoContain';

describe('drawVideoContain', () => {
  it('does nothing when video has no dimensions', () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    drawVideoContain(
      { drawImage, fillRect, fillStyle: '' } as unknown as CanvasRenderingContext2D,
      { videoWidth: 0, videoHeight: 0 },
      100,
      100,
    );
    expect(drawImage).not.toHaveBeenCalled();
    expect(fillRect).not.toHaveBeenCalled();
  });

  it('letterboxes a landscape video on a tall canvas', () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const ctx = {
      drawImage,
      fillRect,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawVideoContain(ctx, { videoWidth: 1920, videoHeight: 1080 }, 360, 640);

    expect(fillRect).toHaveBeenCalledWith(0, 0, 360, 640);
    expect(drawImage).toHaveBeenCalledOnce();
    const [, x, y, w, h] = drawImage.mock.calls[0]!;
    expect(w).toBeLessThanOrEqual(360);
    expect(h).toBeLessThanOrEqual(640);
    expect(w / h).toBeCloseTo(1920 / 1080, 5);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });
});
