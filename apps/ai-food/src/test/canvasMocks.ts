/**
 * jsdom stubs canvas but logs "Not implemented" without the native `canvas`
 * package. Use plain functions (not vi.fn) so `vi.restoreAllMocks()` in tests
 * cannot wipe these polyfills.
 */
export function installCanvasMocks(): void {
  if (typeof HTMLCanvasElement === 'undefined') return;

  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
  ): CanvasRenderingContext2D | null {
    return {
      canvas: this,
      clearRect() {},
      drawImage() {},
      fillRect() {},
      fillStyle: '',
      getImageData: () => ({
        data: new Uint8ClampedArray(4),
        height: 1,
        width: 1,
      }),
      putImageData() {},
      setTransform() {},
    } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function toBlob(
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ): void {
    callback(new Blob(['x'], { type: 'image/png' }));
  } as unknown as typeof HTMLCanvasElement.prototype.toBlob;

  HTMLCanvasElement.prototype.toDataURL = function toDataURL(): string {
    return 'data:image/png;base64,AA==';
  } as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
}
