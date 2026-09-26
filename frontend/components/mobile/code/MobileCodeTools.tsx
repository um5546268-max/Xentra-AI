"use client";

import { ArrowLeft, Sparkles, Wrench, Bug, AlignLeft, Search, GitBranch, Rocket } from "lucide-react";

type Tool = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "violet" | "cyan" | "emerald" | "amber" | "pink" | "blue";
};

const TOOLS: Tool[] = [
  {
    id: "ai",
    label: "AI Assistant",
    subtitle: "Get help with code",
    icon: Sparkles,
    color: "violet",
  },
  {
    id: "generate",
    label: "Code Generator",
    subtitle: "Generate code with AI",
    icon: Wrench,
    color: "cyan",
  },
  {
    id: "debug",
    label: "Debugger",
    subtitle: "Fix issues",
    icon: Bug,
    color: "emerald",
  },
  {
    id: "format",
    label: "Formatter",
    subtitle: "Format code",
    icon: AlignLeft,
    color: "amber",
  },
  {
    id: "search",
    label: "Search in Files",
    subtitle: "Find anything",
    icon: Search,
    color: "pink",
  },
  {
    id: "git",
    label: "Git",
    subtitle: "Version control",
    icon: GitBranch,
    color: "blue",
  },
];

const COLOR_MAP: Record<string, string> = {
  violet:  "from-violet-600/30 to-violet-900/10 border-violet-500/30 text-violet-300",
  cyan:    "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30 text-cyan-300",
  emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  amber:   "from-amber-600/30 to-amber-900/10 border-amber-500/30 text-amber-300",
  pink:    "from-pink-600/30 to-pink-900/10 border-pink-500/30 text-pink-300",
  blue:    "from-blue-600/30 to-blue-900/10 border-blue-500/30 text-blue-300",
};

export default function MobileCodeTools({
  onBack,
  onOpenAI,
  onOpenDebug,
  onOpenSearch,
  onOpenGit,
  onOpenGenerate,
  onOpenFormatter,
}: {
  onBack: () => void;
  onOpenAI: () => void;
  onOpenDebug: () => void;
  onOpenSearch: () => void;
  onOpenGit: () => void;
  onOpenGenerate: () => void;
  onOpenFormatter: () => void;
}) {
  const handleToolClick = (id: string) => {
    switch (id) {
      case "ai": return onOpenAI();
      case "generate": return onOpenGenerate();
      case "debug": return onOpenDebug();
      case "format": return onOpenFormatter();
      case "search": return onOpenSearch();
      case "git": return onOpenGit();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-100">Tools</div>
          <div className="text-[10px] text-slate-500">
            All your coding utilities
          </div>
        </div>
      </div>

      {/* Tools grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const style = COLOR_MAP[t.color];
            return (
              <button
                key={t.id}
                onClick={() => handleToolClick(t.id)}
                className={`flex flex-col items-start gap-3 rounded-2xl border bg-gradient-to-br ${style} p-4 transition active:scale-[0.97] text-left`}
              >
                <div className="w-11 h-11 rounded-2xl bg-slate-950/60 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="w-full">
                  <div className="text-sm font-semibold text-slate-100">
                    {t.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    {t.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Promo card */}
        <div className="mt-4 relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-900/40 via-slate-900 to-cyan-900/20 p-5">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-5 h-5 text-violet-300" />
              <span className="text-sm font-bold text-white">
                Build faster with Xentra AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Let AI write, fix and optimize your code.
            </p>
            <button
              onClick={onOpenAI}
              className="w-full rounded-xl py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              }}
            >
              Try Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}