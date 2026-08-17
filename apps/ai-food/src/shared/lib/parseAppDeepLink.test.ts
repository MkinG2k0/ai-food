import { describe, expect, it } from 'vitest';
import { parseAppDeepLink } from './parseAppDeepLink';

describe('parseAppDeepLink', () => {
  it('routes aifood://stats to /stats', () => {
    expect(parseAppDeepLink('aifood://stats')).toEqual({
      kind: 'route',
      path: '/stats',
    });
  });

  it('routes aifood://stats/ (trailing slash) to /stats', () => {
    expect(parseAppDeepLink('aifood://stats/')).toEqual({
      kind: 'route',
      path: '/stats',
    });
  });

  it('routes com.aifood.app://stats to /stats', () => {
    expect(parseAppDeepLink('com.aifood.app://stats')).toEqual({
      kind: 'route',
      path: '/stats',
    });
  });

  it('routes aifood://subscribe/success with query to subscribe success page', () => {
    expect(
      parseAppDeepLink('aifood://subscribe/success?paymentId=pay_1&mock=1'),
    ).toEqual({
      kind: 'route',
      path: '/subscribe/success?paymentId=pay_1&mock=1',
    });
  });

  it('routes aifood://subscribe/fail with query to subscribe fail page', () => {
    expect(parseAppDeepLink('aifood://subscribe/fail?paymentId=pay_1')).toEqual(
      {
        kind: 'route',
        path: '/subscribe/fail?paymentId=pay_1',
      },
    );
  });

  it('keeps existing aifood://add/* results unchanged', () => {
    expect(parseAppDeepLink('aifood://add/scan')).toEqual({
      kind: 'route',
      path: '/scan',
    });
    expect(parseAppDeepLink('aifood://add/gallery')).toEqual({
      kind: 'home-add',
      add: 'gallery',
    });
    expect(parseAppDeepLink('aifood://add/describe')).toEqual({
      kind: 'home-add',
      add: 'describe',
    });
  });

  it('returns null for unknown hosts', () => {
    expect(parseAppDeepLink('aifood://unknown')).toBeNull();
    expect(parseAppDeepLink('https://example.com')).toBeNull();
  });
});
