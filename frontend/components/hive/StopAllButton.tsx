"use client";

import { useState } from "react";
import { stopAllBees } from "@/lib/bees";

export function StopAllButton() {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    if (!confirm("Stop ALL Bees? Running tasks will be halted safely.")) return;
    setBusy(true);
    try {
      const { stopped } = await stopAllBees();
      alert(`🛑 Stopped ${stopped} Bee${stopped === 1 ? "" : "s"}.`);
    } finally { setBusy(false); }
  };
  return (
    <button onClick={handle} disabled={busy}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold
                 bg-red-500/10 text-red-300 border border-red-500/40
                 hover:bg-red-500/20 disabled:opacity-50">
      🛑 STOP ALL BEES
    </button>
  );
}