import { describe, expect, it, vi } from 'vitest';
import { MediaType, type MediaResult } from '@capacitor/camera';
import { mediaResultToFile } from './takePhoto';

describe('mediaResultToFile', () => {
  it('builds a File from base64 thumbnail', async () => {
    const jpegBase64 =
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z';

    const result: MediaResult = {
      type: MediaType.Photo,
      thumbnail: jpegBase64,
      saved: false,
      metadata: { format: 'jpeg' },
    };

    const file = await mediaResultToFile(result);
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toMatch(/^photo-\d+\.jpg$/);
    expect(file.size).toBeGreaterThan(0);
  });

  it('fetches webPath when thumbnail is missing', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: async () => blob,
      }),
    );

    const result: MediaResult = {
      type: MediaType.Photo,
      webPath: 'blob:http://localhost/photo',
      saved: false,
      metadata: { format: 'png' },
    };

    const file = await mediaResultToFile(result);
    expect(file.type).toBe('image/png');
    expect(file.name).toMatch(/\.png$/);
    expect(file.size).toBe(3);

    vi.unstubAllGlobals();
  });
});
