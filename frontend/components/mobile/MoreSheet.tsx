"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code, FolderOpen, Image as ImageIcon, ShoppingBag,
  Globe, Activity, Wrench, CreditCard, Settings, X,
  Sparkles, ListTodo, Brain, Music, User, MessageSquare,
} from "lucide-react";
import FeedbackModal from "@/components/feedback/FeedbackModal";

const FEATURES = [
  { id: "profile",   label: "Profile",      icon: User,           color: "violet",  href: "/app/profile" },
  { id: "code",      label: "Code",         icon: Code,           color: "violet",  href: "/app/code" },
  { id: "files",     label: "Files",        icon: FolderOpen,     color: "cyan",    href: "/app/files" },
  { id: "media",     label: "Media",        icon: ImageIcon,      color: "pink",    href: "/app/media" },
  { id: "shopping",  label: "Shopping",     icon: ShoppingBag,    color: "emerald", href: "/app/shopping" },
  { id: "browser",   label: "Browser",      icon: Globe,          color: "blue",    href: "/app/browser" },
  { id: "health",    label: "System Health",icon: Activity,       color: "amber",   href: "/app/system-health" },
  { id: "tools",     label: "Tools",        icon: Wrench,         color: "violet",  href: "/app/tools" },
  { id: "tasks",     label: "Tasks",        icon: ListTodo,       color: "cyan",    href: "/app/tasks" },
  { id: "memory",    label: "Memory",       icon: Brain,          color: "pink",    href: "/app/memory" },
  { id: "music",     label: "Music",        icon: Music,          color: "emerald", href: "/app/media" },
  { id: "billing",   label: "Billing",      icon: CreditCard,     color: "amber",   href: "/app/billing" },
  { id: "feedback",  label: "Feedback",     icon: MessageSquare,  color: "violet",  href: "#feedback" },
  { id: "settings",  label: "Settings",     icon: Settings,       color: "slate",   href: "/app/settings" },
];

const COLOR_MAP: Record<string, string> = {
  violet:  "from-violet-600/30 to-violet-900/10 border-violet-500/30 text-violet-300",
  cyan:    "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30 text-cyan-300",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  amber:   "from-amber-600/30 to-amber-900/10 border-amber-500/30 text-amber-300",
  pink:    "from-pink-600/30 to-pink-900/10 border-pink-500/30 text-pink-300",
  blue:    "from-blue-600/30 to-blue-900/10 border-blue-500/30 text-blue-300",
  slate:   "from-slate-600/30 to-slate-900/10 border-slate-500/30 text-slate-300",
};

export default function MoreSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleNav = (href: string) => {
    if (href === "#feedback") {
      setShowFeedback(true);
      return;
    }
    router.push(href);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Sheet */}
        <div
          className="relative w-full max-w-lg mx-auto bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h2 className="text-base font-semibold">All Features</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-3 px-5 pb-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const style = COLOR_MAP[f.color] || COLOR_MAP.slate;
              return (
                <button
                  key={f.id}
                  onClick={() => handleNav(f.href)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border bg-gradient-to-br ${style} p-3 transition active:scale-95`}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-950/60 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feedback modal (opens on top of the sheet) */}
      {showFeedback && (
        <FeedbackModal
          onClose={() => {
            setShowFeedback(false);
            onClose();
          }}
        />
      )}
    </>
  );
}