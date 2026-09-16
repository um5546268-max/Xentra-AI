"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  LogOut,
  Moon,
  Sun,
  MessageSquare,
  ListTodo,
  Play,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Globe,
  Link2,
  Music,
  ShoppingBag,
  Code,
  FolderOpen,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  Conversation,
  getConversations,
  createConversation,
  deleteConversation,
} from "@/lib/conversations";
import { useTasks } from "@/lib/tasks-store";
import NewTaskModal from "./NewTaskModal";

export default function Sidebar() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const { user, logout } = useAuth();
  const { theme, toggle, load } = useTheme();
  const { tasks, startPolling, stopPolling, run } = useTasks();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

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
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (params.conversationId === id) router.push("/app");
  };

  const handleLogout = () => {
    stopPolling();
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen">
      {/* Brand */}
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
          Xentra AI
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your AI Operating Assistant
        </p>
      </div>

      {/* New + Search */}
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

        <button
          onClick={() => router.push("/app/browser")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Globe className="w-4 h-4" />
          Browser agent
        </button>

        <button
          onClick={() => router.push("/app/integrations")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Link2 className="w-4 h-4" />
          Integrations
        </button>

                <button
          onClick={() => router.push("/app/media")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Music className="w-4 h-4" />
          Media
        </button>

                <button
          onClick={() => router.push("/app/shopping")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <ShoppingBag className="w-4 h-4" />
          Shopping
        </button>

                <button
          onClick={() => router.push("/app/code")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Code className="w-4 h-4" />
          Code workspace
        </button>

                <button
          onClick={() => router.push("/app/images")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <ImageIcon className="w-4 h-4" />
          Image generator
        </button>

                <button
          onClick={() => router.push("/app/files")}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <FolderOpen className="w-4 h-4" />
          Files
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

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="border-b border-slate-800 p-3 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <ListTodo className="w-3.5 h-3.5" />
              Tasks
            </div>
            <span className="text-xs text-slate-600">
              {tasks.filter((t) => t.status === "running").length} running
            </span>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {tasks.slice(0, 8).map((t) => (
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
                      title="Run"
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
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-xs text-slate-600 text-center py-8">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-slate-600 text-center py-8">
            {conversations.length === 0 ? "No conversations yet" : "No matches"}
          </div>
        ) : (
          filtered.map((c) => {
            const active = params.conversationId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/app/c/${c.id}`)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition ${
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white transition"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4" /> Light mode
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" /> Dark mode
            </>
          )}
        </button>

        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 truncate">Signed in as</div>
            <div className="text-sm text-slate-300 truncate">
              {user?.full_name || user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNewTask && (
        <NewTaskModal onClose={() => setShowNewTask(false)} />
      )}
    </aside>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "running")
    return <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />;
  if (status === "done")
    return <Check className="w-3 h-3 text-emerald-400" />;
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