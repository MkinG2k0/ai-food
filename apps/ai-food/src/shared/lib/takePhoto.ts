import {
  Camera,
  CameraDirection,
  CameraErrorCode,
  EncodingType,
  type MediaResult,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function mimeFromFormat(format?: string): string {
  const normalized = (format ?? 'jpeg').toLowerCase();
  if (normalized === 'png') return 'image/png';
  if (normalized === 'gif') return 'image/gif';
  if (normalized === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function extensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  if (code === CameraErrorCode.TakePhotoCancelled) return true;
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return message.includes('cancel') || message.includes('cancelled');
}

/** Convert Capacitor Camera MediaResult into a File for existing upload/save flows. */
export async function mediaResultToFile(result: MediaResult): Promise<File> {
  const format = result.metadata?.format;
  const mime = mimeFromFormat(format);
  const filename = `photo-${Date.now()}.${extensionFromMime(mime)}`;

  // On Web, thumbnail holds the full image as base64.
  if (result.thumbnail) {
    const bytes = base64ToUint8Array(result.thumbnail);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return new File([copy.buffer], filename, { type: mime });
  }

  if (result.webPath) {
    // webPath is already usable in the WebView / browser (blob: or capacitor://).
    const response = await fetch(result.webPath);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || mime });
  }

  throw new Error('Camera returned no image data');
}

/**
 * Open the device camera and return a File.
 * Returns null when the user cancels.
 */
export async function takePhotoAsFile(): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    const status = await Camera.requestPermissions({ permissions: ['camera'] });
    if (status.camera !== 'granted' && status.camera !== 'limited') {
      throw new Error('Нет доступа к камере');
    }
  }

  try {
    const result = await Camera.takePhoto({
      quality: 90,
      cameraDirection: CameraDirection.Rear,
      encodingType: EncodingType.JPEG,
    });
    return mediaResultToFile(result);
  } catch (error) {
    if (isUserCancelled(error)) return null;
    throw error;
  }
}
