"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEE_STYLE, BeeType, getHive, HiveSummary } from "@/lib/bees";
import { BeeIcon } from "./BeeIcon";

export function BeeHivePanel() {
  const [hive, setHive] = useState<HiveSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const h = await getHive();
        if (alive) setHive(h);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐝</span>
          <span className="text-sm font-semibold text-slate-200">Bee Hive</span>
        </div>
        <Link href="/bees" className="text-xs text-cyan-400 hover:text-cyan-300">
          Manage
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(["web", "shopping", "file", "coding", "media"] as BeeType[]).map((t) => {
          const bee = hive?.bees.find((b) => b.type === t);
          const pct = bee?.progress ?? 0;
          const style = BEE_STYLE[t];
          return (
            <div key={t} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <BeeIcon type={t} size={44} />
                <div className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  {bee ? `${pct}%` : "Idle"}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">{style.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>

      {hive && (
        <div className="mt-3 text-[11px] text-slate-500 text-center">
          {hive.active} / {hive.quota} Bees busy
        </div>
      )}
    </div>
  );
}