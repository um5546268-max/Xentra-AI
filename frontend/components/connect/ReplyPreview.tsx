"use client";

import { X } from "lucide-react";
import type { ChatMessage } from "@/lib/chat-api";

export default function ReplyPreview({
  message,
  onCancel,
}: {
  message: ChatMessage;
  onCancel: () => void;
}) {
  const preview =
    message.content.length > 80
      ? message.content.slice(0, 80) + "…"
      : message.content;

  return (
    <div className="flex items-center gap-2 mb-2 rounded-lg border border-violet-500/40 bg-violet-500/5 px-3 py-2">
      <div className="w-0.5 h-8 bg-violet-500 rounded shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-violet-300 font-medium">
          Replying to {message.sender_name || "them"}
        </div>
        <div className="text-xs text-slate-400 truncate">{preview}</div>
      </div>
      <button
        onClick={onCancel}
        className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}