import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectBarcodeInVideo,
  extractBarcodeValue,
  resetBarcodeFileScannerForTests,
} from './detectBarcode';

describe('extractBarcodeValue', () => {
  it('keeps digit barcodes of length >= 8', () => {
    expect(extractBarcodeValue('4600605021123')).toBe('4600605021123');
    expect(extractBarcodeValue('EAN 4600605021123')).toBe('4600605021123');
  });

  it('falls back to trimmed raw for non-numeric codes', () => {
    expect(extractBarcodeValue('  ABC-123  ')).toBe('ABC-123');
  });
});

describe('detectBarcodeInVideo live mode', () => {
  afterEach(() => {
    resetBarcodeFileScannerForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function makeVideo(width = 640, height = 480): HTMLVideoElement {
    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', {
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });
    Object.defineProperty(video, 'videoWidth', { value: width });
    Object.defineProperty(video, 'videoHeight', { value: height });
    return video;
  }

  it('does not create JPEG blobs or allocate a file-fallback canvas on live path without detector', async () => {
    vi.stubGlobal('BarcodeDetector', undefined);
    const video = makeVideo();
    const createEl = vi.spyOn(document, 'createElement');
    const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');

    const result = await detectBarcodeInVideo(video, { mode: 'live' });

    expect(result).toBeNull();
    expect(toBlobSpy).not.toHaveBeenCalled();
    expect(
      createEl.mock.calls.filter(([tag]) => tag === 'canvas'),
    ).toHaveLength(0);
  });

  it('uses cached BarcodeDetector across live calls', async () => {
    const detect = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ rawValue: '4600605021123' }]);
    const Detector = vi.fn().mockImplementation(() => ({ detect }));
    vi.stubGlobal('BarcodeDetector', Detector);

    const video = makeVideo();
    expect(await detectBarcodeInVideo(video, { mode: 'live' })).toBeNull();
    expect(await detectBarcodeInVideo(video, { mode: 'live' })).toBe(
      '4600605021123',
    );
    expect(Detector).toHaveBeenCalledTimes(1);
    expect(detect).toHaveBeenCalledTimes(2);
  });

  it('resetBarcodeFileScannerForTests clears detector cache', async () => {
    const detect = vi.fn().mockResolvedValue([]);
    const Detector = vi.fn().mockImplementation(() => ({ detect }));
    vi.stubGlobal('BarcodeDetector', Detector);

    const video = makeVideo();
    await detectBarcodeInVideo(video, { mode: 'live' });
    resetBarcodeFileScannerForTests();
    await detectBarcodeInVideo(video, { mode: 'live' });

    expect(Detector).toHaveBeenCalledTimes(2);
  });
});
