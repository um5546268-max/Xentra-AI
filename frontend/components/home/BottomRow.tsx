"use client";

import { useRouter } from "next/navigation";
import {
  Layers, HelpCircle, GitBranch, StickyNote, TrendingUp, FileText, Clock,
} from "lucide-react";

const STUDY_PROGRESS = [
  { subject: "English", pct: 75, color: "bg-violet-500" },
  { subject: "Math", pct: 60, color: "bg-cyan-500" },
  { subject: "Physics", pct: 45, color: "bg-emerald-500" },
  { subject: "Chemistry", pct: 30, color: "bg-amber-500" },
  { subject: "Programming", pct: 20, color: "bg-pink-500" },
];

const QUICK_TOOLS = [
  { id: "flashcards", label: "Flashcards", sub: "Study smarter", icon: Layers, color: "text-violet-300", href: "/app/learn" },
  { id: "quiz", label: "Quiz", sub: "Test your knowledge", icon: HelpCircle, color: "text-cyan-300", href: "/app/learn?tab=quiz" },
  { id: "mindmap", label: "Mind Map", sub: "Visual learning", icon: GitBranch, color: "text-emerald-300", href: "/app/learn" },
  { id: "notes", label: "Notes", sub: "Take quick notes", icon: StickyNote, color: "text-amber-300", href: "/app/notes" },
];

export function BottomRow() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Study Progress */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Study Progress
          </div>
          <button
            onClick={() => router.push("/app/progress")}
            className="text-[10px] text-violet-400 hover:text-violet-300"
          >
            View Details
          </button>
        </div>
        <div className="space-y-2">
          {STUDY_PROGRESS.map((s) => (
            <div key={s.subject} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 text-slate-400 truncate">{s.subject}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
              </div>
              <span className="font-mono text-slate-500 w-8 text-right">
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tools */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="text-xs font-medium text-slate-400">Quick Tools</div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => router.push(t.href)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-left hover:bg-slate-950 transition"
              >
                <Icon className={`w-4 h-4 ${t.color}`} />
                <div className="text-[11px] font-medium">{t.label}</div>
                <div className="text-[9px] text-slate-500">{t.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Learning Analytics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-slate-400">Learning Analytics</div>
          <button
            onClick={() => router.push("/app/progress")}
            className="text-[10px] text-violet-400 hover:text-violet-300"
          >
            View Report →
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#8b5cf6" strokeWidth="4"
                strokeDasharray="68 100"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm font-bold">68%</div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <AnalyticRow icon={<FileText className="w-3 h-3" />} label="Subjects Studied" value={12} />
            <AnalyticRow icon={<Clock className="w-3 h-3" />} label="Hours Learned" value={38} />
            <AnalyticRow icon={<Layers className="w-3 h-3" />} label="Topics Completed" value={142} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1 text-slate-500 truncate">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}