import { timingSafeEqual } from 'node:crypto';

export {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './adminSessionToken';

export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}
