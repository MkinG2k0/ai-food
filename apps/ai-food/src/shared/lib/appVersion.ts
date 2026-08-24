/** Injected at build time from package.json (see vite.config.ts). */
export function getAppVersion(): string {
  const version = import.meta.env.VITE_APP_VERSION;
  return typeof version === 'string' && version.length > 0 ? version : 'unknown';
}
