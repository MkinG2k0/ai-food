export function isLivePreviewPainting({
  cameraActive,
  hasCameraError,
  capturing,
}: {
  cameraActive: boolean;
  hasCameraError: boolean;
  capturing: boolean;
}): boolean {
  return cameraActive && !hasCameraError && !capturing;
}
