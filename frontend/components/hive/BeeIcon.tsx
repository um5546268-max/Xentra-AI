"use client";

import { BEE_STYLE, BeeType } from "@/lib/bees";

export function BeeIcon({
  type, size = 40,
}: { type: BeeType; size?: number }) {
  const s = BEE_STYLE[type];
  return (
    <div
      className="rounded-2xl flex items-center justify-center shadow-inner"
      style={{
        width: size, height: size,
        background: `radial-gradient(circle at 30% 30%, ${s.color}55, ${s.color}22)`,
        border: `1px solid ${s.color}55`,
      }}
      title={s.label}
    >
      <span style={{ fontSize: size * 0.5 }}>🐝</span>
    </div>
  );
}