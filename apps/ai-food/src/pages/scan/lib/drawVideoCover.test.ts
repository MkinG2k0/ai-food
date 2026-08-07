import { describe, expect, it, vi } from 'vitest';
import { drawVideoCover } from './drawVideoCover';

describe('drawVideoCover', () => {
  it('does nothing when video has no dimensions', () => {
    const drawImage = vi.fn();
    drawVideoCover(
      { drawImage } as unknown as CanvasRenderingContext2D,
      { videoWidth: 0, videoHeight: 0 },
      100,
      100,
    );
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('scales to cover a taller canvas', () => {
    const drawImage = vi.fn();
    drawVideoCover(
      { drawImage } as unknown as CanvasRenderingContext2D,
      { videoWidth: 1920, videoHeight: 1080 },
      360,
      640,
    );
    expect(drawImage).toHaveBeenCalledOnce();
    const [, x, y, w, h] = drawImage.mock.calls[0]!;
    expect(w).toBeGreaterThanOrEqual(360);
    expect(h).toBeGreaterThanOrEqual(640);
    expect(w / h).toBeCloseTo(1920 / 1080, 5);
    expect(x).toBeLessThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(0);
  });
});
