---
status: complete
---

# Summary: Client-side image compression before AI

Compressed photos on the client via Canvas before AI Gateway upload — no backend changes.

## Done

- `compressImageForAi` in `shared/lib` — max side 1024px, JPEG 0.8, fallback to original
- Wired in `analyzeFoodApi` before `fileToDataUrl`
- Diary still saves the original `File` from `useImageStore`
- Unit tests + existing analyzeFoodApi tests pass (42)

## Notes

- HEIC / decode failures → original file sent (same as before)
- Preview / saved meal image quality unchanged
