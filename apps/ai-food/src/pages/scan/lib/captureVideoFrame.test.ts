import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureVideoFrame, snapshotVideoFrame } from './captureVideoFrame';

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

  it('encodes a paused video when dimensions are set', async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob(['paused'], { type: 'image/jpeg' }));
      }),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const pausedVideo = {
      videoWidth: 640,
      videoHeight: 480,
      paused: true,
    } as HTMLVideoElement;

    const file = await captureVideoFrame(pausedVideo);

    expect(file).toBeInstanceOf(File);
    expect(file?.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledWith(pausedVideo, 0, 0, 640, 480);
  });

  it('snapshotVideoFrame copies pixels without waiting on toBlob', () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const snapped = snapshotVideoFrame(mockVideo(640, 480), { maxSide: 1024 });

    expect(snapped).toBe(canvas);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(toBlob).not.toHaveBeenCalled();
  });
});
