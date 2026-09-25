"use client";

import { useEffect, useRef } from "react";
import {
  UserPlus, Users, Bell, BellOff, Trash2, LogOut, Search,
  Image as ImageIcon, Info, Pin, ShieldOff, X,
} from "lucide-react";

export type HeaderMenuAction =
  | "add_friend"
  | "new_group"
  | "mute"
  | "search"
  | "view_media"
  | "view_pinned"
  | "clear_history"
  | "leave_group"
  | "chat_info";

export default function ChatHeaderMenu({
  chatType,
  isMuted,
  onAction,
  onClose,
  position,
}: {
  chatType: "direct" | "group";
  isMuted: boolean;
  onAction: (a: HeaderMenuAction) => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);

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
      className="fixed z-50 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
      style={{
        left: Math.min(position.x, window.innerWidth - 240),
        top: Math.min(position.y, window.innerHeight - 380),
      }}
    >
      <div className="p-1">
        <Row
          icon={<Search className="w-3.5 h-3.5" />}
          label="Search messages"
          onClick={() => onAction("search")}
        />
        <Row
          icon={<Pin className="w-3.5 h-3.5" />}
          label="Pinned messages"
          onClick={() => onAction("view_pinned")}
        />
        <Row
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          label="Shared media"
          onClick={() => onAction("view_media")}
        />
        <Row
          icon={isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          label={isMuted ? "Unmute chat" : "Mute chat"}
          onClick={() => onAction("mute")}
        />
        <Row
          icon={<Info className="w-3.5 h-3.5" />}
          label="Chat info"
          onClick={() => onAction("chat_info")}
        />
      </div>

      <div className="p-1 border-t border-slate-800">
        {chatType === "direct" && (
          <Row
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Add friend"
            onClick={() => onAction("add_friend")}
          />
        )}
        {chatType === "group" && (
          <Row
            icon={<Users className="w-3.5 h-3.5" />}
            label="New group"
            onClick={() => onAction("new_group")}
          />
        )}
      </div>

      <div className="p-1 border-t border-slate-800">
        <Row
          icon={<Trash2 className="w-3.5 h-3.5" />}
          label="Clear history"
          onClick={() => onAction("clear_history")}
          danger
        />
        {chatType === "group" && (
          <Row
            icon={<LogOut className="w-3.5 h-3.5" />}
            label="Leave group"
            onClick={() => onAction("leave_group")}
            danger
          />
        )}
      </div>
    </div>
  );
}

function Row({
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