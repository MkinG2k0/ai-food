/**
 * Canonical add-food deep link actions.
 * Android twin: `AddFoodActionWidgetProvider` + six 1×1 providers use `aifood://add/<action>`.
 * Tokens must stay in sync: scan | scan-describe | gallery | describe | manual | favorites
 */
export const ADD_FOOD_DEEP_LINK_ACTIONS = [
  'scan',
  'scan-describe',
  'gallery',
  'describe',
  'manual',
  'favorites',
] as const;

export type AddFoodDeepLinkAction = (typeof ADD_FOOD_DEEP_LINK_ACTIONS)[number];

export type AddFoodDeepLinkResult =
  | { kind: 'route'; path: string }
  | { kind: 'home-add'; add: 'gallery' | 'describe' };

const ACTION_SET = new Set<string>(ADD_FOOD_DEEP_LINK_ACTIONS);

const ROUTE_BY_ACTION: Record<
  Exclude<AddFoodDeepLinkAction, 'gallery' | 'describe'>,
  string
> = {
  scan: '/scan',
  'scan-describe': '/scan?describe=1',
  manual: '/manual-entry',
  favorites: '/favorites',
};

function extractAction(url: string): string | null {
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

  // aifood://add/<action> → host=add, pathname=/<action> or /add/<action>
  // Some bridges rewrite to aifood:///add/<action> (empty host, path /add/<action>)
  const host = parsed.hostname.toLowerCase();
  const pathParts = parsed.pathname
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);

  if (host === 'add') {
    return pathParts[0] ?? null;
  }

  const addIdx = pathParts.findIndex((p) => p.toLowerCase() === 'add');
  if (addIdx >= 0 && pathParts[addIdx + 1]) {
    return pathParts[addIdx + 1];
  }

  // Fallback: host itself is the action (rare)
  if (ACTION_SET.has(host) && pathParts.length === 0) {
    return host;
  }

  return null;
}

export function parseAddFoodDeepLink(
  url: string,
): AddFoodDeepLinkResult | null {
  const action = extractAction(url);
  if (!action || !ACTION_SET.has(action)) {
    return null;
  }

  if (action === 'gallery' || action === 'describe') {
    return { kind: 'home-add', add: action };
  }

  const path =
    ROUTE_BY_ACTION[action as Exclude<AddFoodDeepLinkAction, 'gallery' | 'describe'>];
  return { kind: 'route', path };
}
