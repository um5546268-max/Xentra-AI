"use client";

import { useRouter } from "next/navigation";
import {
  Search, Globe, ShoppingBag, Music, Activity, Brain,
  Wrench, ChevronRight, Sparkles,
} from "lucide-react";

const TOOLS = [
  {
    id: "search",
    label: "Search",
    description: "Find anything",
    icon: Search,
    color: "violet",
    href: "/app/browser",
  },
  {
    id: "browser",
    label: "Browser Agent",
    description: "Web tasks on autopilot",
    icon: Globe,
    color: "cyan",
    href: "/app/browser",
  },
  {
    id: "shopping",
    label: "Shopping",
    description: "Find the best deals",
    icon: ShoppingBag,
    color: "emerald",
    href: "/app/shopping",
  },
  {
    id: "media",
    label: "Media",
    description: "Play & edit media",
    icon: Music,
    color: "pink",
    href: "/app/media",
  },
  {
    id: "system-health",
    label: "System Health",
    description: "Check your device",
    icon: Activity,
    color: "amber",
    href: "/app/system-health",
  },
  {
    id: "memory",
    label: "Memory",
    description: "Remember important",
    icon: Brain,
    color: "violet",
    href: "/app/memory",
  },
  {
    id: "automations",
    label: "Automations",
    description: "Save time",
    icon: Wrench,
    color: "cyan",
    href: "/app/automations",
  },
  {
    id: "deep",
    label: "Deep Research",
    description: "In-depth research",
    icon: Sparkles,
    color: "emerald",
    href: "/app/browser",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: "from-violet-600/30 to-violet-900/10 border-violet-500/30",   text: "text-violet-300" },
  cyan:    { bg: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30",         text: "text-cyan-300" },
  emerald: { bg: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30",text: "text-emerald-300" },
  amber:   { bg: "from-amber-600/30 to-amber-900/10 border-amber-500/30",      text: "text-amber-300" },
  pink:    { bg: "from-pink-600/30 to-pink-900/10 border-pink-500/30",         text: "text-pink-300" },
};

export default function MobileTools() {
  const router = useRouter();

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Tools</div>
            <div className="text-[11px] text-slate-500">
              All your powerful tools
            </div>
          </div>
        </div>
      </div>

      {/* Grid of tool cards */}
      <div className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const style = COLOR_MAP[t.color] || COLOR_MAP.violet;
            return (
              <button
                key={t.id}
                onClick={() => router.push(t.href)}
                className={`flex flex-col items-start gap-3 rounded-2xl border bg-gradient-to-br ${style.bg} p-4 transition active:scale-95 text-left`}
              >
                <div className="w-11 h-11 rounded-2xl bg-slate-950/60 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${style.text}`} />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">
                      {t.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}