import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVideoFrame } from './captureVideoFrame';

function mockVideo(width: number, height: number): HTMLVideoElement {
  return {
    videoWidth: width,
    videoHeight: height,
  } as HTMLVideoElement;
}

describe('captureVideoFrame', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when video has no dimensions', async () => {
    await expect(captureVideoFrame(mockVideo(0, 0))).resolves.toBeNull();
  });

  it('downscales long edge to maxSide before toBlob', async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob(['x'], { type: 'image/jpeg' }));
      }),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const file = await captureVideoFrame(mockVideo(1920, 1080), {
      maxSide: 1024,
    });

    expect(file).toBeInstanceOf(File);
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(576);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1024,
      576,
    );
  });
});
