"use client";

import { useEffect, useRef } from "react";
import { Reply, Pencil, Trash2, SmilePlus } from "lucide-react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export type MessageAction = "reply" | "edit" | "delete" | "react";

export default function MessageActions({
  isMine,
  onAction,
  onReact,
  onClose,
  position,
}: {
  isMine: boolean;
  onAction: (action: MessageAction) => void;
  onReact: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 240),
        top: Math.min(position.y, window.innerHeight - 200),
      }}
    >
      {/* Reactions row */}
      <div className="flex items-center gap-1 p-1.5 border-b border-slate-800">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-base transition"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="p-1">
        <ActionRow
          icon={<Reply className="w-3.5 h-3.5" />}
          label="Reply"
          onClick={() => onAction("reply")}
        />
        {isMine && (
          <>
            <ActionRow
              icon={<Pencil className="w-3.5 h-3.5" />}
              label="Edit"
              onClick={() => onAction("edit")}
            />
            <ActionRow
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label="Delete"
              onClick={() => onAction("delete")}
              danger
            />
          </>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition text-left ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}