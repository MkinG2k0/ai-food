import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFile = vi.fn();
const readFile = vi.fn();
const getUri = vi.fn();
let isNativePlatform = false;

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: (...args: unknown[]) => writeFile(...args),
    readFile: (...args: unknown[]) => readFile(...args),
    getUri: (...args: unknown[]) => getUri(...args),
  },
  Directory: { Data: 'DATA' },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform,
    convertFileSrc: (uri: string) => `capacitor://${uri}`,
  },
  registerPlugin: vi.fn(() => ({})),
}));

import { saveMealImage, getMealImageSrc, loadMealImageAsFile } from './mealImage';

describe('mealImage', () => {
  beforeEach(() => {
    isNativePlatform = false;
    writeFile.mockReset();
    readFile.mockReset();
    getUri.mockReset();
  });

  it('loadMealImageAsFile returns a JPEG File from base64 storage data', async () => {
    // base64 for "hello"
    readFile.mockResolvedValue({ data: 'aGVsbG8=' });

    const file = await loadMealImageAsFile('meal-images/abc.jpg');

    expect(readFile).toHaveBeenCalledWith({
      path: 'meal-images/abc.jpg',
      directory: 'DATA',
    });
    expect(file).toBeInstanceOf(File);
    expect(file!.type).toBe('image/jpeg');
    expect(file!.name).toBe('retry.jpg');
  });

  it('loadMealImageAsFile returns null when Filesystem read fails', async () => {
    readFile.mockRejectedValue(new Error('not found'));

    const file = await loadMealImageAsFile('meal-images/missing.jpg');

    expect(file).toBeNull();
  });


  it('saves a file to the filesystem and returns its path', async () => {
    writeFile.mockResolvedValue({ uri: 'file:///meal-images/abc.jpg' });
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    const path = await saveMealImage(file);

    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ directory: 'DATA', recursive: true })
    );
    expect(path).toMatch(/^meal-images\/.+\.jpg$/);
  });

  it('resolves a data URL from base64 string data on web', async () => {
    readFile.mockResolvedValue({ data: 'aGVsbG8=' });

    const src = await getMealImageSrc('meal-images/abc.jpg');

    expect(readFile).toHaveBeenCalledWith({ path: 'meal-images/abc.jpg', directory: 'DATA' });
    expect(src).toBe('data:image/jpeg;base64,aGVsbG8=');
  });

  it('resolves a display URL from Filesystem Blob data on web', async () => {
    const blob = new Blob(['data'], { type: 'image/jpeg' });
    readFile.mockResolvedValue({ data: blob });

    const src = await getMealImageSrc('meal-images/abc.jpg');

    expect(src).toMatch(/^blob:/);
  });

  it('resolves a converted file src on native platforms', async () => {
    isNativePlatform = true;
    getUri.mockResolvedValue({ uri: 'file:///var/mobile/meal-images/abc.jpg' });

    const src = await getMealImageSrc('meal-images/abc.jpg');

    expect(getUri).toHaveBeenCalledWith({ path: 'meal-images/abc.jpg', directory: 'DATA' });
    expect(src).toBe('capacitor://file:///var/mobile/meal-images/abc.jpg');
  });
});
