import { describe, expect, it } from 'vitest';
import { fileToImageDataUrl } from './fileToImageDataUrl';

describe('fileToImageDataUrl', () => {
  it('builds jpeg data URL for compressed file', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const dataUrl = await fileToImageDataUrl(file);

    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('normalizes unknown mime to jpeg', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.heic', {
      type: 'image/heic',
    });

    const dataUrl = await fileToImageDataUrl(file);

    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('normalizes empty mime to jpeg', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', {
      type: '',
    });

    const dataUrl = await fileToImageDataUrl(file);

    expect(dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });
});
