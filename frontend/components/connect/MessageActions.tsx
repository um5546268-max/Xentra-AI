"use client";

import { useEffect, useRef, useState } from "react";
import {
  Reply, Pencil, Trash2, Copy, Share2, Sparkles, Pin, PinOff,
  Plus,
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export type MessageAction =
  | "reply"
  | "edit"
  | "delete"
  | "react"
  | "copy"
  | "share"
  | "pin"
  | "unpin";

export default function MessageActions({
  isMine,
  isAI,
  isPinned,
  onAction,
  onReact,
  onClose,
  position,
}: {
  isMine: boolean;
  isAI: boolean;
  isPinned?: boolean;
  onAction: (action: MessageAction) => void;
  onReact: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  // Close on outside click / Escape (only for the menu itself)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Don't close if the picker is open and this click was inside it
        const pickerEl = document.querySelector("[data-emoji-picker]");
        if (pickerEl && pickerEl.contains(e.target as Node)) return;
        onClose();
      }
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

  const canEdit = isMine;
  const canDelete = isMine;

  const handlePlusClick = () => {
    if (!plusButtonRef.current) return;
    const rect = plusButtonRef.current.getBoundingClientRect();
    // Place picker below the button
    setPickerPos({
      x: Math.min(rect.left, window.innerWidth - 340),
      y: Math.min(rect.bottom + 8, window.innerHeight - 400),
    });
    setShowPicker(true);
  };

  return (
    <>
      <div
        ref={ref}
        className="fixed z-50 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
        style={{
          left: Math.min(position.x, window.innerWidth - 260),
          top: Math.min(position.y, window.innerHeight - 320),
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
          {/* ✅ Plus button for full picker */}
          <button
            ref={plusButtonRef}
            onClick={handlePlusClick}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              showPicker
                ? "bg-violet-500/20 text-violet-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="More emojis"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-1">
          <ActionRow
            icon={<Reply className="w-3.5 h-3.5" />}
            label="Reply"
            onClick={() => onAction("reply")}
          />

          <ActionRow
            icon={<Copy className="w-3.5 h-3.5" />}
            label={isAI ? "Copy AI response" : "Copy text"}
            onClick={() => onAction("copy")}
          />

          <ActionRow
            icon={<Share2 className="w-3.5 h-3.5" />}
            label="Forward"
            onClick={() => onAction("share")}
          />

          <ActionRow
            icon={isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            label={isPinned ? "Unpin" : "Pin message"}
            onClick={() => onAction(isPinned ? "unpin" : "pin")}
          />

          {canEdit && (
            <ActionRow
              icon={<Pencil className="w-3.5 h-3.5" />}
              label={isAI ? "Edit AI message" : "Edit"}
              onClick={() => onAction("edit")}
            />
          )}

          {canDelete && (
            <ActionRow
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label={isAI ? "Delete AI message" : "Delete"}
              onClick={() => onAction("delete")}
              danger
            />
          )}

          {isAI && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-slate-800 mt-1 text-[10px] text-violet-400">
              <Sparkles className="w-3 h-3" />
              AI-generated
            </div>
          )}
        </div>
      </div>

      {/* ✅ Full emoji picker */}
      {showPicker && (
        <div data-emoji-picker style={{ position: "fixed", left: pickerPos.x, top: pickerPos.y, zIndex: 60 }}>
          <EmojiPicker
            onSelect={(emoji) => {
              onReact(emoji);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </>
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