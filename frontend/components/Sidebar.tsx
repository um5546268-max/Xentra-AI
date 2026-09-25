"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  Plus, Search, Trash2, LogOut, MessageSquare, ListTodo, Play,
  Check, AlertCircle, Loader2, Sparkles, Image as ImageIcon,
  FolderOpen, ChevronDown, ChevronRight, Wrench, Settings,
  ShieldCheck, Activity, PanelLeftClose, PanelLeftOpen,
  GraduationCap, Users, Home, Code as CodeIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Conversation,
  getConversations,
  createConversation,
  deleteConversation,
} from "@/lib/conversations";
import { useTasks } from "@/lib/tasks-store";
import { useShellStore } from "@/lib/shell-store";
import NewTaskModal from "./NewTaskModal";
import NotificationsBell from "./NotificationsBell";
import Avatar from "@/components/Avatar";
import NotificationToggle from "@/components/connect/NotificationToggle";

// ─────────────────────────────────────────────────────────────
// MAIN NAV — matches mockup
// ─────────────────────────────────────────────────────────────
const MAIN_NAV = [
  { path: "/app", label: "Home", icon: Home },
  { path: "/app/c", label: "AI Chat", icon: MessageSquare },
  { path: "/app/connect", label: "Connect", icon: Users, badge: 3 },
  { path: "/app/learn", label: "Learning", icon: GraduationCap },
  { path: "/app/code", label: "Code", icon: CodeIcon },
  { path: "/app/media", label: "Media", icon: ImageIcon },
  { path: "/app/files", label: "Files", icon: FolderOpen },
  { path: "/app/tasks", label: "Tasks", icon: ListTodo },
  { path: "/app/tools", label: "Tools", icon: Wrench },
  { path: "/app/system-health", label: "System Health", icon: Activity },
  { path: "/app/permissions", label: "Security", icon: ShieldCheck },
  { path: "/app/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const pathname = usePathname();

  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const { tasks, startPolling, stopPolling, run } = useTasks();
  const { sidebarCollapsed, toggleSidebar } = useShellStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showTasks, setShowTasks] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      ),
    [conversations, search]
  );

  const handleNew = async () => {
    const convo = await createConversation();
    setConversations((prev) => [convo, ...prev]);
    router.push(`/app/c/${convo.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await deleteConversation(id);
    } catch (err: any) {
      if (err?.response?.status !== 404) return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (params.conversationId === id) router.push("/app");
  };

  const handleLogout = () => {
    stopPolling();
    logout();
    router.push("/login");
  };

  const isActive = (path: string) => {
    if (path === "/app") return pathname === "/app";
    return pathname?.startsWith(path);
  };

  // ─────────────────────────────────────────────────────────
  // COLLAPSED MODE
  // ─────────────────────────────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <aside className="w-14 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen items-center py-3 gap-1 overflow-y-auto">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition shrink-0"
          title="Expand sidebar (Ctrl+B)"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-1 shrink-0" />

        <button
          onClick={handleNew}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white transition shrink-0"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-1 shrink-0" />

        {MAIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition shrink-0 ${
                active
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title={item.label}
            >
              <Icon className="w-4 h-4" />
              {item.badge ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-violet-600 text-white text-[8px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-1 shrink-0 pt-2">
          <div className="w-8 border-t border-slate-800 my-1" />
          <div title={user?.email}>
            <Avatar
              src={user?.avatar_url}
              name={user?.full_name}
              email={user?.email}
              size={32}
            />
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-red-400 transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────
  // EXPANDED MODE
  // ─────────────────────────────────────────────────────────
  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src="/x-logo.png"
            alt="Xentra"
            className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]"
          />
          <div className="min-w-0">
            <h1 className="text-base font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent leading-tight">
              XENTRA AI
            </h1>
            <p className="text-[10px] text-slate-500">Your AI Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <NotificationToggle />
          <NotificationsBell />
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
            title="Collapse sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Primary actions */}
        <div className="p-3 space-y-2 border-b border-slate-800">
          <button
            onClick={handleNew}
            className="w-full flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium hover:bg-violet-500 transition"
          >
            <Plus className="w-4 h-4" />
            New conversation
          </button>
          <button
            onClick={() => setShowNewTask(true)}
            className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            <Sparkles className="w-4 h-4" />
            New task
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        {/* MAIN NAV */}
        <nav className="p-2 space-y-0.5">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge ? (
                  <span
                    className={`text-[10px] min-w-[20px] h-5 px-1.5 rounded-full font-semibold flex items-center justify-center ${
                      active ? "bg-white/25 text-white" : "bg-violet-600 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Tasks (progress view) */}
        {tasks.length > 0 && (
          <div className="border-t border-slate-800">
            <button
              onClick={() => setShowTasks(!showTasks)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-900 transition"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">
                Running tasks ({tasks.filter((t) => t.status === "running").length})
              </span>
              {showTasks ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {showTasks && (
              <div className="p-3 pt-0 space-y-1">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg bg-slate-900/60 px-2 py-1.5 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <StatusDot status={t.status} />
                      <span className="truncate flex-1 text-slate-300">
                        {t.type}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {t.progress}%
                      </span>
                      {t.status === "queued" && (
                        <button
                          onClick={() => run(t.id)}
                          className="text-violet-400 hover:text-violet-300"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${progressColor(
                          t.status
                        )}`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent chats */}
        {filtered.length > 0 && (
          <div className="border-t border-slate-800 p-2 space-y-0.5">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Recent chats
            </div>
            {filtered.slice(0, 5).map((c) => {
              const active = params.conversationId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/app/c/${c.id}`)}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
                    active
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom ── */}
      <div className="shrink-0 border-t border-slate-800">
        {/* ✅ More together card with X logo — clickable → System Health */}
        <div className="p-3">
          <button
            onClick={() => router.push("/app/system-health")}
            className="w-full relative rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-slate-900 to-cyan-500/5 p-3 overflow-hidden hover:border-violet-500/60 transition text-center"
            title="Open System Health"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-violet-500/30 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center">
              {/* ✅ X logo instead of sparkle */}
              <img
                src="/x-logo.png"
                alt="Xentra"
                className="w-11 h-11 object-contain mb-2 drop-shadow-[0_0_15px_rgba(139,92,246,0.7)]"
              />
              <div className="text-xs font-semibold text-slate-100 leading-tight">
                More together.
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Learn · Create · Grow
              </div>
            </div>
          </button>
        </div>

        {/* User row */}
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
            <div className="shrink-0" title={user?.email}>
              <Avatar
                src={user?.avatar_url}
                name={user?.full_name}
                email={user?.email}
                size={30}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 leading-tight">
                Signed in as
              </div>
              <div className="text-xs text-slate-300 font-medium truncate">
                {user?.full_name || user?.email || "Guest"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 text-slate-500 hover:text-red-400 transition p-1 rounded"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
    </aside>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "running")
    return <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />;
  if (status === "done") return <Check className="w-3 h-3 text-emerald-400" />;
  if (status === "failed")
    return <AlertCircle className="w-3 h-3 text-red-400" />;
  if (status === "paused")
    return <span className="w-3 h-3 text-yellow-400">⏸</span>;
  if (status === "cancelled")
    return <span className="w-3 h-3 text-slate-500">✕</span>;
  return <span className="w-3 h-3 text-slate-500">○</span>;
}

function progressColor(status: string) {
  if (status === "done") return "bg-emerald-500";
  if (status === "failed") return "bg-red-500";
  if (status === "paused") return "bg-yellow-500";
  if (status === "running") return "bg-violet-500";
  return "bg-slate-600";
}