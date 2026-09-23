"use client";

import { useEffect, useRef } from "react";

/**
 * usePolling — calls `fn` every `intervalMs` while mounted.
 * - Uses setTimeout (not setInterval) so slow requests don't stack up.
 * - Respects browser tab visibility (pauses when tab is hidden).
 * - Cancels cleanly on unmount.
 */
export function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true
) {
  const savedFn = useRef(fn);
  savedFn.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        try {
          await savedFn.current();
        } catch (e) {
          console.error("[polling] error:", e);
        }
      }
      if (cancelled) return;
      timeoutId = setTimeout(tick, intervalMs);
    };

    // First run immediately, then schedule
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [intervalMs, enabled]);
}