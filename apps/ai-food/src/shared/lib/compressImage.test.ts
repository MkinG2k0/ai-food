import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_IMAGE_JPEG_QUALITY,
  AI_IMAGE_MAX_SIDE,
  compressImageForAi,
} from './compressImage';

function mockBitmap(width: number, height: number) {
  return {
    width,
    height,
    close: vi.fn(),
  };
}

describe('compressImageForAi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns non-image files unchanged', async () => {
    const file = new File(['text'], 'note.txt', { type: 'text/plain' });
    await expect(compressImageForAi(file)).resolves.toBe(file);
  });

  it('falls back to original when createImageBitmap fails', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode failed')),
    );
    const file = new File(['x'], 'gallery.jpg', { type: 'image/jpeg' });
    await expect(compressImageForAi(file)).resolves.toBe(file);
  });

  it('downscales long edge to maxSide and returns jpeg', async () => {
    const bitmap = mockBitmap(4000, 3000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob([new Uint8Array(1200)], { type: 'image/jpeg' }));
      }),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const original = new File([new Uint8Array(500_000)], 'meal.png', {
      type: 'image/png',
    });
    const result = await compressImageForAi(original);

    expect(result).not.toBe(original);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('meal.jpg');
    expect(canvas.width).toBe(AI_IMAGE_MAX_SIDE);
    expect(canvas.height).toBe(768);
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      AI_IMAGE_JPEG_QUALITY,
    );
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('skips shutter jpeg without decode or re-encode', async () => {
    const createImageBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmap);

    const original = new File([new Uint8Array(90_000)], 'food-1734567890123.jpg', {
      type: 'image/jpeg',
    });
    const result = await compressImageForAi(original);

    expect(result).toBe(original);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('skips re-encode when jpeg already fits maxSide and size budget', async () => {
    const bitmap = mockBitmap(1024, 768);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const toBlob = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: vi.fn(),
      toBlob,
    } as unknown as HTMLCanvasElement);

    const original = new File([new Uint8Array(90_000)], 'gallery.jpg', {
      type: 'image/jpeg',
    });
    const result = await compressImageForAi(original);

    expect(result).toBe(original);
    expect(toBlob).not.toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('keeps original when no downscale and blob is not smaller', async () => {
    const bitmap = mockBitmap(800, 600);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob([new Uint8Array(2000)], { type: 'image/jpeg' }));
      }),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const original = new File([new Uint8Array(1000)], 'small.jpg', {
      type: 'image/jpeg',
    });
    const result = await compressImageForAi(original);
    expect(result).toBe(original);
  });

  it('respects custom maxSide', async () => {
    const bitmap = mockBitmap(2000, 1000);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob: vi.fn((cb: BlobCallback) => {
        cb(new Blob([new Uint8Array(100)], { type: 'image/jpeg' }));
      }),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(
      canvas as unknown as HTMLCanvasElement,
    );

    const original = new File([new Uint8Array(50_000)], 'wide.jpg', {
      type: 'image/jpeg',
    });
    await compressImageForAi(original, { maxSide: 500 });

    expect(canvas.width).toBe(500);
    expect(canvas.height).toBe(250);
  });
});
