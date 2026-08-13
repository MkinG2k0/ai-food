import { describe, expect, it } from 'vitest';
import { isLivePreviewPainting } from './isLivePreviewPainting';

describe('isLivePreviewPainting', () => {
  it('is true only when the camera is live, error-free, and not capturing', () => {
    expect(
      isLivePreviewPainting({
        cameraActive: true,
        hasCameraError: false,
        capturing: false,
      }),
    ).toBe(true);
  });

  it('is false when cameraActive is false', () => {
    expect(
      isLivePreviewPainting({
        cameraActive: false,
        hasCameraError: false,
        capturing: false,
      }),
    ).toBe(false);
  });

  it('is false when hasCameraError is true', () => {
    expect(
      isLivePreviewPainting({
        cameraActive: true,
        hasCameraError: true,
        capturing: false,
      }),
    ).toBe(false);
  });

  it('is false when capturing is true', () => {
    expect(
      isLivePreviewPainting({
        cameraActive: true,
        hasCameraError: false,
        capturing: true,
      }),
    ).toBe(false);
  });
});
