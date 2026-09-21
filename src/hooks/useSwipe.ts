import { useRef } from "react";
import type { TouchEvent } from "react";

/** Horizontal swipe detection for touch screens. Returns handlers to spread
 * on an element; a swipe counts only when it's mostly sideways and long
 * enough, so vertical scrolling and taps are untouched. Swipes that start on
 * a form control are ignored. */
export function useSwipe({ onLeft, onRight, threshold = 64 }: { onLeft?: () => void; onRight?: () => void; threshold?: number }) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [data-no-swipe]")) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd(e: TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      if (dx < 0) onLeft?.();
      else onRight?.();
    },
  };
}
