import { describe, expect, it } from 'vitest';
import {
  ADD_FOOD_DEEP_LINK_ACTIONS,
  parseAddFoodDeepLink,
} from './addFoodDeepLink';

describe('parseAddFoodDeepLink', () => {
  it('maps scan to /scan', () => {
    expect(parseAddFoodDeepLink('aifood://add/scan')).toEqual({
      kind: 'route',
      path: '/scan',
    });
  });

  it('maps scan-describe to /scan', () => {
    expect(parseAddFoodDeepLink('aifood://add/scan-describe')).toEqual({
      kind: 'route',
      path: '/scan',
    });
  });

  it('maps manual to /manual-entry', () => {
    expect(parseAddFoodDeepLink('aifood://add/manual')).toEqual({
      kind: 'route',
      path: '/manual-entry',
    });
  });

  it('maps favorites to /favorites', () => {
    expect(parseAddFoodDeepLink('aifood://add/favorites')).toEqual({
      kind: 'route',
      path: '/favorites',
    });
  });

  it('maps gallery to home-add gallery', () => {
    expect(parseAddFoodDeepLink('aifood://add/gallery')).toEqual({
      kind: 'home-add',
      add: 'gallery',
    });
  });

  it('maps describe to home-add describe', () => {
    expect(parseAddFoodDeepLink('aifood://add/describe')).toEqual({
      kind: 'home-add',
      add: 'describe',
    });
  });

  it('returns null for unknown action', () => {
    expect(parseAddFoodDeepLink('aifood://add/unknown')).toBeNull();
  });

  it('returns null for unrelated https URL', () => {
    expect(parseAddFoodDeepLink('https://example.com')).toBeNull();
  });

  it('accepts Capacitor-style package scheme with /add/<action> path', () => {
    expect(parseAddFoodDeepLink('com.aifood.app://add/scan')).toEqual({
      kind: 'route',
      path: '/scan',
    });
  });

  it('documents the six action tokens shared with AddFoodWidgetProvider', () => {
    expect([...ADD_FOOD_DEEP_LINK_ACTIONS]).toEqual([
      'scan',
      'scan-describe',
      'gallery',
      'describe',
      'manual',
      'favorites',
    ]);
  });

  it('parses the full widget URI list for every documented action', () => {
    const uris = ADD_FOOD_DEEP_LINK_ACTIONS.map(
      (action) => `aifood://add/${action}`,
    );
    expect(uris).toEqual([
      'aifood://add/scan',
      'aifood://add/scan-describe',
      'aifood://add/gallery',
      'aifood://add/describe',
      'aifood://add/manual',
      'aifood://add/favorites',
    ]);
    for (const uri of uris) {
      expect(parseAddFoodDeepLink(uri)).not.toBeNull();
    }
  });
});
