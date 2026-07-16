# Quick: Client-side image compression before AI

**Goal:** Shrink photos on the client (Canvas) before sending to AI Gateway — no backend.

## Decisions

- Pure Canvas / `createImageBitmap` — no new deps
- Max longest side **1024px**, JPEG quality **0.8**
- Compress only inside `analyzeFoodApi` (AI payload); diary keeps original `File` from store
- If decode/compress fails → fall back to original file

## Tasks

1. Add `compressImageForAi` in `shared/lib` + unit tests (mocked bitmap/canvas)
2. Call it in `analyzeFoodApi` before `fileToDataUrl`
3. Export from barrel; verify existing analyze tests still pass
