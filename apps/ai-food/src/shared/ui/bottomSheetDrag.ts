export type SheetDragIntent = 'pending' | 'scroll' | 'sheet';

export interface ResolveSheetDragIntentParams {
  fromHandle: boolean;
  /** Nearest scrollable ancestor scrollTop; null when none. */
  scrollTop: number | null;
  deltaY: number;
  threshold?: number;
}

export interface ShouldAllowSheetDragFromTargetParams {
  target: EventTarget | null;
  boundary: HTMLElement | null;
  fromHandle: boolean;
}

const DEFAULT_DIRECTION_THRESHOLD = 8;

export function isVerticallyScrollable(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
    return false;
  }
  return el.scrollHeight > el.clientHeight + 1;
}

export function findScrollableAncestor(
  start: EventTarget | null,
  boundary: HTMLElement | null,
): HTMLElement | null {
  let el: HTMLElement | null =
    start instanceof HTMLElement
      ? start
      : start instanceof Node
        ? start.parentElement
        : null;

  while (el && el !== boundary) {
    if (isVerticallyScrollable(el)) return el;
    el = el.parentElement;
  }
  return null;
}

export function resolveSheetDragIntent({
  fromHandle,
  scrollTop,
  deltaY,
  threshold = DEFAULT_DIRECTION_THRESHOLD,
}: ResolveSheetDragIntentParams): SheetDragIntent {
  if (fromHandle) return 'sheet';
  if (scrollTop != null && scrollTop > 0) return 'scroll';
  if (Math.abs(deltaY) < threshold) return 'pending';
  return deltaY > 0 ? 'sheet' : 'scroll';
}

export function shouldAllowSheetDragFromTarget({
  target,
  boundary,
  fromHandle,
}: ShouldAllowSheetDragFromTargetParams): boolean {
  if (fromHandle) return true;
  const scrollable = findScrollableAncestor(target, boundary);
  if (!scrollable) return true;
  return scrollable.scrollTop <= 0;
}
