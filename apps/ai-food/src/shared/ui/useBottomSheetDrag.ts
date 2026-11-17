import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { useDragControls, type DragControls } from 'framer-motion';

import {
  findScrollableAncestor,
  resolveSheetDragIntent,
  shouldAllowSheetDragFromTarget,
} from './bottomSheetDrag';

export interface UseBottomSheetDragResult {
  dragControls: DragControls;
  handleRef: RefObject<HTMLDivElement>;
  sheetRef: RefObject<HTMLDivElement>;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSheetPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

interface PendingPointer {
  pointerId: number;
  startY: number;
}

export function useBottomSheetDrag(): UseBottomSheetDragResult {
  const dragControls = useDragControls();
  const handleRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingPointer | null>(null);

  const clearPending = (pointerId?: number): void => {
    if (pointerId == null || pendingRef.current?.pointerId === pointerId) {
      pendingRef.current = null;
    }
  };

  const onHandlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    event.stopPropagation();
    pendingRef.current = null;
    dragControls.start(event);
  };

  const onSheetPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const handle = handleRef.current;
    if (handle && handle.contains(event.target as Node)) return;

    const allowed = shouldAllowSheetDragFromTarget({
      target: event.target,
      boundary: sheetRef.current,
      fromHandle: false,
    });
    if (!allowed) {
      pendingRef.current = null;
      return;
    }

    pendingRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
    };
  };

  const onSheetPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;

    const scrollable = findScrollableAncestor(
      event.target,
      sheetRef.current,
    );
    const intent = resolveSheetDragIntent({
      fromHandle: false,
      scrollTop: scrollable ? scrollable.scrollTop : null,
      deltaY: event.clientY - pending.startY,
    });

    if (intent === 'pending') return;

    pendingRef.current = null;
    if (intent === 'sheet') {
      dragControls.start(event);
    }
  };

  const onSheetPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ): void => {
    clearPending(event.pointerId);
  };

  return {
    dragControls,
    handleRef,
    sheetRef,
    onHandlePointerDown,
    onSheetPointerDown,
    onSheetPointerMove,
    onSheetPointerUp,
  };
}
