"use client";

import { useState } from "react";
import { Pin, X, ChevronDown, ChevronRight } from "lucide-react";
import { ChatMessage } from "@/lib/chat-api";

export default function PinnedBar({
  pins,
  onJumpTo,
  onUnpin,
}: {
  pins: ChatMessage[];
  onJumpTo: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pins.length === 0) return null;

  const current = pins[currentIndex];
  const senderName = current.sender_name || "Them";
  const preview =
    current.content.length > 80
      ? current.content.slice(0, 80) + "…"
      : current.content;

  const nextPin = () => {
    setCurrentIndex((i) => (i + 1) % pins.length);
  };

  const prevPin = () => {
    setCurrentIndex((i) => (i - 1 + pins.length) % pins.length);
  };

  return (
    <div className="border-b border-slate-800 bg-gradient-to-r from-violet-500/5 to-slate-950">
      {/* Bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-violet-500/20 shrink-0">
          <Pin className="w-3.5 h-3.5 text-violet-300" />
        </div>

        <button
          onClick={() => onJumpTo(current.id)}
          className="flex-1 min-w-0 text-left hover:opacity-90 transition"
        >
          <div className="text-[10px] text-violet-300 font-medium">
            Pinned message · {senderName}
          </div>
          <div className="text-xs text-slate-300 truncate">{preview}</div>
        </button>

        {/* Pin navigation (when multiple) */}
        {pins.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={prevPin}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
              title="Previous pin"
            >
              ‹
            </button>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {currentIndex + 1}/{pins.length}
            </span>
            <button
              onClick={nextPin}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1"
              title="Next pin"
            >
              ›
            </button>
          </div>
        )}

        {/* Show all toggle */}
        {pins.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-300 transition shrink-0"
            title={expanded ? "Hide all pins" : "Show all pins"}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Unpin current */}
        <button
          onClick={() => onUnpin(current.id)}
          className="text-slate-500 hover:text-red-400 transition shrink-0"
          title="Unpin"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded list */}
      {expanded && pins.length > 1 && (
        <div className="px-4 pb-2 space-y-1 border-t border-slate-800/50">
          {pins.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setCurrentIndex(i);
                onJumpTo(p.id);
              }}
              className={`w-full flex items-start gap-2 rounded-lg p-2 text-left transition ${
                i === currentIndex
                  ? "bg-violet-500/10 border border-violet-500/30"
                  : "hover:bg-slate-900 border border-transparent"
              }`}
            >
              <Pin className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-500">
                  {p.sender_name || "Them"}
                </div>
                <div className="text-xs text-slate-300 line-clamp-1">
                  {p.content.slice(0, 100)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}