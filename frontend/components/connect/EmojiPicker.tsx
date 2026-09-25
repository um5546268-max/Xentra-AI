"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { EMOJI_CATEGORIES } from "@/lib/emoji-data";

export default function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Filter by query
  const activeCat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
  const baseEmojis = activeCat?.emojis || [];
  const filtered = query.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(query))
    : baseEmojis;

  return (
    <div
      ref={ref}
      className="fixed z-[60] w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
      style={{ maxHeight: "380px" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search bar */}
      <div className="p-2 border-b border-slate-800 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji…"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-2 py-1.5 text-xs placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category tabs */}
      {!query.trim() && (
        <div className="flex gap-0.5 px-1.5 py-1.5 border-b border-slate-800 overflow-x-auto">
          {EMOJI_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCategory(c.id);
                scrollRef.current?.scrollTo({ top: 0 });
              }}
              title={c.name}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition shrink-0 ${
                activeCategory === c.id
                  ? "bg-violet-500/20 ring-1 ring-violet-500/40"
                  : "hover:bg-slate-800"
              }`}
            >
              {c.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">
            No emojis found
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {filtered.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xl hover:bg-slate-800 transition"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-600">
        {filtered.length} emoji{filtered.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}