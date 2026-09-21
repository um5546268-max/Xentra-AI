"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  orientation: "vertical" | "horizontal";   // vertical = left/right split
  onResize: (deltaPx: number) => void;
  min?: number;      // minimum px change per event (throttle)
};

export function Splitter({ orientation, onResize }: Props) {
  const [dragging, setDragging] = useState(false);
  const lastPosRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const pos = orientation === "vertical" ? e.clientX : e.clientY;
      if (lastPosRef.current !== null) {
        const delta = pos - lastPosRef.current;
        if (Math.abs(delta) > 2) {
          onResize(delta);
          lastPosRef.current = pos;
        }
      } else {
        lastPosRef.current = pos;
      }
    };

    const onUp = () => {
      setDragging(false);
      lastPosRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor =
      orientation === "vertical" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, orientation, onResize]);

  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      className={`${
        orientation === "vertical"
          ? "w-1 cursor-col-resize hover:bg-violet-500/50"
          : "h-1 cursor-row-resize hover:bg-violet-500/50"
      } bg-slate-800 transition-colors shrink-0 ${
        dragging ? "bg-violet-500" : ""
      }`}
      style={{ flexShrink: 0 }}
    />
  );
}