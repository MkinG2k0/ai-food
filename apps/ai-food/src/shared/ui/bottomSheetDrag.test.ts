import { describe, expect, it } from 'vitest';

import {
  findScrollableAncestor,
  isVerticallyScrollable,
  resolveSheetDragIntent,
  shouldAllowSheetDragFromTarget,
} from './bottomSheetDrag';

describe('resolveSheetDragIntent', () => {
  it('always starts sheet drag from the handle', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: true,
        scrollTop: 40,
        deltaY: -20,
      }),
    ).toBe('sheet');
  });

  it('keeps scroll ownership when content is scrolled', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: false,
        scrollTop: 12,
        deltaY: 40,
      }),
    ).toBe('scroll');
  });

  it('waits for direction when content is at the top', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: false,
        scrollTop: 0,
        deltaY: 3,
      }),
    ).toBe('pending');
  });

  it('dismiss-drags when pulling down from scroll top', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: false,
        scrollTop: 0,
        deltaY: 16,
      }),
    ).toBe('sheet');
  });

  it('lets content scroll when pulling up from scroll top', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: false,
        scrollTop: 0,
        deltaY: -16,
      }),
    ).toBe('scroll');
  });

  it('allows sheet drag for non-scrollable content after downward move', () => {
    expect(
      resolveSheetDragIntent({
        fromHandle: false,
        scrollTop: null,
        deltaY: 20,
      }),
    ).toBe('sheet');
  });
});

describe('shouldAllowSheetDragFromTarget', () => {
  it('allows drag when there is no scrollable ancestor', () => {
    const boundary = document.createElement('div');
    const child = document.createElement('div');
    boundary.appendChild(child);
    expect(
      shouldAllowSheetDragFromTarget({
        target: child,
        boundary,
        fromHandle: false,
      }),
    ).toBe(true);
  });

  it('blocks drag when a scrollable ancestor is not at the top', () => {
    const boundary = document.createElement('div');
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    Object.defineProperty(scroller, 'scrollTop', { value: 50, writable: true });
    scroller.style.overflowY = 'auto';
    const child = document.createElement('div');
    scroller.appendChild(child);
    boundary.appendChild(scroller);

    expect(
      shouldAllowSheetDragFromTarget({
        target: child,
        boundary,
        fromHandle: false,
      }),
    ).toBe(false);
  });

  it('allows drag from handle even inside a scrolled area', () => {
    const boundary = document.createElement('div');
    const handle = document.createElement('div');
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    Object.defineProperty(scroller, 'scrollTop', { value: 50, writable: true });
    scroller.style.overflowY = 'auto';
    boundary.appendChild(handle);
    boundary.appendChild(scroller);

    expect(
      shouldAllowSheetDragFromTarget({
        target: handle,
        boundary,
        fromHandle: true,
      }),
    ).toBe(true);
  });
});

describe('isVerticallyScrollable / findScrollableAncestor', () => {
  it('finds the nearest overflow-y scrollable ancestor', () => {
    const boundary = document.createElement('div');
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    scroller.style.overflowY = 'auto';
    const child = document.createElement('div');
    scroller.appendChild(child);
    boundary.appendChild(scroller);

    expect(isVerticallyScrollable(scroller)).toBe(true);
    expect(findScrollableAncestor(child, boundary)).toBe(scroller);
  });
});
