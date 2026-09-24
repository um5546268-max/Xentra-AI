"use client";

import { useEffect, useState } from "react";
import {
  Image as ImageIcon, FileText, Video as VideoIcon, Mic,
  Loader2, X, Download,
} from "lucide-react";
import { ChatMessage, listSharedMedia } from "@/lib/chat-api";

type FilterType = "image" | "file" | "video";

export default function SharedMedia({ chatId }: { chatId: string }) {
  const [tab, setTab] = useState<FilterType>("image");
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<ChatMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSharedMedia(chatId, tab)
      .then((m) => {
        if (!cancelled) setItems(m);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, tab]);

  return (
    <>
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Shared Files & Media
          </h5>
          <span className="text-[10px] text-slate-500">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          <TabButton
            active={tab === "image"}
            onClick={() => setTab("image")}
            icon={<ImageIcon className="w-3 h-3" />}
            label="Images"
          />
          <TabButton
            active={tab === "file"}
            onClick={() => setTab("file")}
            icon={<FileText className="w-3 h-3" />}
            label="Files"
          />
          <TabButton
            active={tab === "video"}
            onClick={() => setTab("video")}
            icon={<VideoIcon className="w-3 h-3" />}
            label="Videos"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-slate-600">
            No {tab}s shared yet
          </div>
        ) : tab === "image" ? (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpanded(item)}
                className="aspect-square rounded-lg overflow-hidden border border-slate-800 hover:border-violet-500/40 transition group relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.meta?.url}
                  alt={item.meta?.name || "image"}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </button>
            ))}
          </div>
        ) : tab === "file" ? (
          <div className="space-y-1.5">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.meta?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2 hover:bg-slate-900 hover:border-violet-500/40 transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-300 truncate">
                    {item.meta?.name || "File"}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {formatBytes(item.meta?.size)} ·{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition" />
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setExpanded(item)}
                className="aspect-video rounded-lg overflow-hidden border border-slate-800 hover:border-violet-500/40 transition relative bg-slate-900"
              >
                <video
                  src={item.meta?.url}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <VideoIcon className="w-5 h-5 text-white" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded viewer */}
      {expanded && (
        <div
          onClick={() => setExpanded(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {expanded.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expanded.meta?.url}
              alt={expanded.meta?.name || "image"}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : expanded.type === "video" ? (
            <video
              src={expanded.meta?.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition ${
        active
          ? "bg-violet-500/20 text-violet-300"
          : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}