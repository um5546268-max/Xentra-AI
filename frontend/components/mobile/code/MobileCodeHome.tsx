"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code as CodeIcon, Plus, FolderOpen, LayoutTemplate, Sparkles,
  ChevronRight, Clock, FileCode, Folder, Download,
} from "lucide-react";
import { getTree } from "@/lib/code";

export default function MobileCodeHome({
  onOpenExplorer,
  onOpenTemplates,
  onOpenAssistant,
  onNewProjectCreated,
}: {
  onOpenExplorer: () => void;
  onOpenTemplates: () => void;
  onOpenAssistant: () => void;
  onNewProjectCreated?: () => void;
}) {
  const router = useRouter();
  const [stats, setStats] = useState({
    files: 0,
    folders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTree("")
      .then((res) => {
        const count = (entries: any[]): { files: number; folders: number } => {
          let files = 0;
          let folders = 0;
          for (const e of entries) {
            if (e.type === "file") files += 1;
            else if (e.type === "directory") {
              folders += 1;
              if (e.children) {
                const c = count(e.children);
                files += c.files;
                folders += c.folders;
              }
            }
          }
          return { files, folders };
        };
        setStats(count(res.entries || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNewProject = async () => {
    const name = prompt("Project name:");
    if (!name) return;
    try {
      const { createEntry } = await import("@/lib/code");
      await createEntry(name, "folder", "");
      onNewProjectCreated?.();
    } catch (e) {
      alert("Failed to create project");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <CodeIcon className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
              Xentra AI
            </div>
            <div className="text-[10px] text-slate-500">Your AI Agent</div>
          </div>
        </div>
        <button
          onClick={() => router.push("/app/profile")}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm"
        >
          {(typeof window !== "undefined" &&
            JSON.parse(localStorage.getItem("xentra_user") || "{}")?.full_name?.[0]) ||
            "U"}
        </button>
      </div>

      {/* Hero card */}
      <div className="px-4 pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-900/40 via-slate-900 to-cyan-900/20 p-6">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/40"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
              }}
            >
              <CodeIcon className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">
              Code Workspace
            </h1>
            <p className="text-[11px] text-violet-300 mb-1">
              Write · Build · Run · Create
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Turn your ideas into real projects.
            </p>

            <button
              onClick={handleNewProject}
              className="w-full rounded-2xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 transition active:scale-95"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
              }}
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Action grid */}
      <div className="px-4 pb-4 space-y-2.5">
        <ActionBtn
          icon={<FolderOpen className="w-5 h-5" />}
          title="Open Project"
          subtitle="Load your existing project"
          color="cyan"
          onClick={onOpenExplorer}
        />
        <ActionBtn
          icon={<LayoutTemplate className="w-5 h-5" />}
          title="Templates"
          subtitle="Start with ready-to-use templates"
          color="violet"
          onClick={onOpenTemplates}
        />
        <ActionBtn
          icon={<Sparkles className="w-5 h-5" />}
          title="AI Coding"
          subtitle="Get help from Xentra AI"
          color="emerald"
          onClick={onOpenAssistant}
        />
      </div>

      {/* Stats row */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard
            icon={<FileCode className="w-4 h-4 text-violet-400" />}
            value={stats.files}
            label="Files"
          />
          <StatCard
            icon={<Folder className="w-4 h-4 text-cyan-400" />}
            value={stats.folders}
            label="Folders"
          />
          <StatCard
            icon={<Download className="w-4 h-4 text-emerald-400" />}
            value="Ready"
            label="Status"
          />
        </div>
      </div>

      {/* Recent Projects */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-200">
            Recent Projects
          </div>
          <button
            onClick={onOpenExplorer}
            className="text-[11px] text-violet-400"
          >
            View All →
          </button>
        </div>

        <button
          onClick={onOpenExplorer}
          className="w-full flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 hover:bg-slate-900 transition text-left"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/30 to-violet-900/10 border border-violet-500/30 flex items-center justify-center shrink-0">
            <CodeIcon className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">
              Workspace
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
              <Clock className="w-3 h-3" />
              Recently active
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
        </button>
      </div>
    </div>
  );
}

// ─── Action Button ───
function ActionBtn({
  icon,
  title,
  subtitle,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: "violet" | "cyan" | "emerald";
  onClick: () => void;
}) {
  const map = {
    violet: "from-violet-600/30 to-violet-900/10 border-violet-500/30 text-violet-300",
    cyan: "from-cyan-600/30 to-cyan-900/10 border-cyan-500/30 text-cyan-300",
    emerald: "from-emerald-600/30 to-emerald-900/10 border-emerald-500/30 text-emerald-300",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${map[color]} p-4 hover:scale-[1.01] transition text-left active:scale-[0.99]`}
    >
      <div className="w-11 h-11 rounded-xl bg-slate-950/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
    </button>
  );
}

// ─── Stat Card ───
function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
      <div className="flex items-center justify-center mb-1.5">{icon}</div>
      <div className="text-base font-bold text-slate-100">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}