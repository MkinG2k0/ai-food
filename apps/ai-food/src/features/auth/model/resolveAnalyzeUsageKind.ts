export function resolveAnalyzeUsageKind({
  hasImage,
  hasDescription,
}: {
  hasImage: boolean;
  hasDescription: boolean;
}): 'analyze_photo' | 'analyze_text' | 'analyze_photo_text' {
  if (hasImage && hasDescription) return 'analyze_photo_text';
  if (hasImage) return 'analyze_photo';
  return 'analyze_text';
}
