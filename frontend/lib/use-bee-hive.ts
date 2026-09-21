"use client";

import { useEffect, useState } from "react";
import { getHive, HiveSummary } from "./bees";

export function useBeeHive(pollMs = 4000): HiveSummary | null {   // 👈 explicit return
  const [hive, setHive] = useState<HiveSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const h = await getHive();
        if (alive) setHive(h);
      } catch {
        // silent
      }
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return hive;
}