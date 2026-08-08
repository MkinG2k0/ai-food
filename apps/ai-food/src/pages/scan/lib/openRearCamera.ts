/**
 * Prefer the main rear sensor at ~1080p landscape.
 * Do NOT request portrait WxH — Android often digitally crops that (= fake zoom).
 */
export function rearCameraConstraints(): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}

type ZoomCapabilities = { min: number; max: number; step?: number };

/**
 * Prefer optical/logical 1x when available.
 * Using zoom.min alone can still land on a cropped mode; 1.0 matches native "1x".
 */
export function pickOneXZoom(zoom: ZoomCapabilities): number {
  if (zoom.min <= 1 && zoom.max >= 1) return 1;
  return zoom.min;
}

/** Reset digital zoom toward native 1x. */
export async function applyNativeZoomOneX(
  track: MediaStreamTrack,
): Promise<void> {
  const caps = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { zoom?: ZoomCapabilities })
    | undefined;
  if (!caps?.zoom) return;

  try {
    await track.applyConstraints({
      advanced: [
        { zoom: pickOneXZoom(caps.zoom) } as unknown as MediaTrackConstraintSet,
      ],
    });
  } catch {
    // Device may advertise zoom but reject applyConstraints — keep stream.
  }
}

/**
 * Open environment-facing camera at landscape HD and force 1x zoom when supported.
 */
export async function openRearCamera(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia(
    rearCameraConstraints(),
  );
  const track = stream.getVideoTracks()[0];
  if (track) await applyNativeZoomOneX(track);
  return stream;
}
