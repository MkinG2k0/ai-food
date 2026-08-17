import {
  parseAddFoodDeepLink,
  type AddFoodDeepLinkResult,
} from './addFoodDeepLink';

export type AppDeepLinkResult = AddFoodDeepLinkResult;

/**
 * App custom-scheme deep links: stats route + existing add-food actions.
 * Schemes: {@code aifood} / {@code com.aifood.app}.
 */
export function parseAppDeepLink(url: string): AppDeepLinkResult | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  const allowedScheme = scheme === 'aifood' || scheme === 'com.aifood.app';
  if (!allowedScheme) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const pathParts = parsed.pathname
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  // aifood://stats or aifood://stats/ → /stats
  if (host === 'stats' && pathParts.length === 0) {
    return { kind: 'route', path: '/stats' };
  }

  // aifood:///stats (empty host, path /stats)
  if (
    (host === '' || host === 'stats') &&
    pathParts.length === 1 &&
    pathParts[0].toLowerCase() === 'stats'
  ) {
    return { kind: 'route', path: '/stats' };
  }

  // aifood://subscribe/success|fail?paymentId=… → /subscribe/success|fail
  let subscribeOutcome: 'success' | 'fail' | null = null;
  if (host === 'subscribe' && pathParts.length === 1) {
    const action = pathParts[0].toLowerCase();
    if (action === 'success' || action === 'fail') {
      subscribeOutcome = action;
    }
  }
  if (
    (host === '' || host === 'subscribe') &&
    pathParts.length === 2 &&
    pathParts[0].toLowerCase() === 'subscribe'
  ) {
    const action = pathParts[1].toLowerCase();
    if (action === 'success' || action === 'fail') {
      subscribeOutcome = action;
    }
  }
  if (subscribeOutcome) {
    return {
      kind: 'route',
      path: `/subscribe/${subscribeOutcome}${parsed.search}`,
    };
  }

  return parseAddFoodDeepLink(url);
}
