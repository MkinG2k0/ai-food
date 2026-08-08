import { describe, expect, it, vi } from 'vitest';
import {
  applyNativeZoomOneX,
  pickOneXZoom,
  rearCameraConstraints,
} from './openRearCamera';

describe('rearCameraConstraints', () => {
  it('requests landscape HD for the main rear sensor', () => {
    expect(rearCameraConstraints()).toEqual({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  });
});

describe('pickOneXZoom', () => {
  it('prefers 1 when the range includes it', () => {
    expect(pickOneXZoom({ min: 0.5, max: 8 })).toBe(1);
    expect(pickOneXZoom({ min: 1, max: 10 })).toBe(1);
  });

  it('falls back to min when 1 is outside the range', () => {
    expect(pickOneXZoom({ min: 2, max: 10 })).toBe(2);
  });
});

describe('applyNativeZoomOneX', () => {
  it('applies zoom 1 when available', async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const track = {
      getCapabilities: () => ({ zoom: { min: 0.5, max: 8 } }),
      applyConstraints,
    } as unknown as MediaStreamTrack;

    await applyNativeZoomOneX(track);

    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ zoom: 1 }],
    });
  });

  it('no-ops when zoom is unsupported', async () => {
    const applyConstraints = vi.fn();
    const track = {
      getCapabilities: () => ({}),
      applyConstraints,
    } as unknown as MediaStreamTrack;

    await applyNativeZoomOneX(track);

    expect(applyConstraints).not.toHaveBeenCalled();
  });
});
