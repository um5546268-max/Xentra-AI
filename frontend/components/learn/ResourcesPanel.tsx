"use client";

import { ExternalLink, Youtube, Globe, FileText, GraduationCap, Sparkles } from "lucide-react";
import { Resource } from "@/lib/learn";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  video: { icon: Youtube, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  website: { icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  pdf: { icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
  course: { icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
};

export function ResourcesPanel({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-violet-300" />
        Recommended learning resources
      </div>

      <div className="grid grid-cols-1 gap-2">
        {resources.map((r, i) => {
          const config = TYPE_CONFIG[r.type] ?? TYPE_CONFIG.website;
          const Icon = config.icon;
          return (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-start gap-3 rounded-lg border p-3 hover:scale-[1.01] transition ${config.bg}`}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-950/60 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  {r.difficulty && (
                    <span className="text-[9px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-500 shrink-0">
                      {r.difficulty}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {r.description}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                  {r.source}
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}