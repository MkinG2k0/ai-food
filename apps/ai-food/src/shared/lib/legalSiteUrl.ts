export type LegalPath = '/terms' | '/privacy' | '/refunds';

export function getLegalUrl(
  path: LegalPath,
  baseUrl: string | undefined = import.meta.env.VITE_LEGAL_SITE_URL as
    | string
    | undefined,
): string | null {
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}${path}`;
}
