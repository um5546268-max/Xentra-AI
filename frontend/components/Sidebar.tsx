"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  LogOut,
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
  Image as ImageIcon,
  FolderOpen,
  Brain,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Shield,
  Settings,
  ScrollText,
  CreditCard,
  ShieldCheck,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Video,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { StickyNote } from "lucide-react";
import {
  Conversation,
  getConversations,
  createConversation,
  deleteConversation,
} from "@/lib/conversations";
import { Book } from "lucide-react";
import { useTasks } from "@/lib/tasks-store";
import { useBeeHive } from "@/lib/use-bee-hive";
import { useShellStore } from "@/lib/shell-store";
import { BeeIcon } from "@/components/hive/BeeIcon";
import { BEE_STYLE, BeeType } from "@/lib/bees";
import NewTaskModal from "./NewTaskModal";
import NotificationsBell from "./NotificationsBell";
import { UserStats } from "@/components/learn/UserStats";
import {
  BookOpen, Languages, GitBranch, ClipboardList, TrendingUp, Trophy,
  Library, Upload, ChevronDown as ChevronDownIcon, Layers, HelpCircle,
} from "lucide-react";
import { Target } from "lucide-react";

const TOOLS = [
  { path: "/app/browser", label: "Browser agent", icon: Globe },
  { path: "/app/integrations", label: "Integrations", icon: Link2 },
  { path: "/app/media", label: "Media", icon: Music },
  { path: "/app/shopping", label: "Shopping", icon: ShoppingBag },
  { path: "/app/code", label: "Code workspace", icon: Code },
  { path: "/app/images", label: "Image generator", icon: ImageIcon },
  { path: "/app/files", label: "Files", icon: FolderOpen },
  { path: "/app/memory", label: "Memory", icon: Brain },
  { path: "/app/automations", label: "Automations", icon: Clock },
  { path: "/app/settings", label: "Settings", icon: Settings },
  { path: "/app/billing", label: "Billing", icon: CreditCard },
  { path: "/app/videos", label: "Video generator", icon: Video },
];

const SECURITY = [
  { path: "/app/permissions", label: "Permissions", icon: Shield },
  { path: "/app/pending", label: "Pending actions", icon: Clock },
  { path: "/app/audit", label: "Audit log", icon: ScrollText },
];

const HIVE_SHOWCASE: BeeType[] = ["web", "shopping", "file", "coding", "media"];

export default function Sidebar() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const pathname = usePathname();

  const { user, logout } = useAuth();
  const { tasks, startPolling, stopPolling, run } = useTasks();
  const hive = useBeeHive();
  const { sidebarCollapsed, toggleSidebar } = useShellStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showStudy, setShowStudy] = useState(true);
  const [showStudyTools, setShowStudyTools] = useState(false);

  const STUDY_ITEMS = [
  { path: "/app/learn/subjects", label: "All Subjects", icon: BookOpen },
  { path: "/app/books", label: "Books", icon: Book },
  { path: "/app/learn/languages", label: "Languages", icon: Languages },
  { path: "/app/learn/school", label: "School / College", icon: GraduationCap },
];

const STUDY_TOOLS = [
  { path: "/app/learn", label: "Flashcards", icon: Layers },
  { path: "/app/learn?tab=quiz", label: "Quizzes", icon: HelpCircle },
  { path: "/app/notes", label: "Notes", icon: StickyNote },
  { path: "/app/learn", label: "Mind Map", icon: GitBranch },
  { path: "/app/learn/practice", label: "Practice Tests", icon: ClipboardList },
];

const STUDY_MORE = [
  { path: "/app/goals", label: "Goals", icon: Target },
  { path: "/app/library", label: "My Library", icon: Library },
  { path: "/app/import", label: "Import & Convert", icon: Upload },
  { path: "/app/progress", label: "Progress & Points", icon: TrendingUp },  // ← this should already be here
  { path: "/app/leaderboard", label: "Leaderboards", icon: Trophy },
];

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
      if (err?.response?.status !== 404) {
        console.error("[sidebar] Delete failed:", err);
        return;
      }
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (params.conversationId === id) router.push("/app");
  };

  const handleLogout = () => {
    stopPolling();
    logout();
    router.push("/login");
  };

  // ═══════════════════════════════════════════════════════════
  // COLLAPSED MODE — icon-only rail
  // ═══════════════════════════════════════════════════════════
  if (sidebarCollapsed) {
    return (
      <aside className="w-14 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen items-center py-3 gap-1">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition"
          title="Expand sidebar (Ctrl+B)"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-1" />

        <button
          onClick={handleNew}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white transition"
          title="New conversation"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowNewTask(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          title="New task"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="w-8 border-t border-slate-800 my-1" />

        <button
          onClick={() => router.push("/app/bees")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
            pathname?.startsWith("/app/bees")
              ? "bg-violet-500/20 text-violet-300"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title={`Bees (${hive?.active ?? 0}/${hive?.quota ?? 0})`}
        >
          <span className="text-base">🐝</span>
        </button>

        {TOOLS.slice(0, 6).map((tool) => {
          const Icon = tool.icon;
          const active = pathname === tool.path;
          return (
            <button
              key={tool.path}
              onClick={() => router.push(tool.path)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
                active
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title={tool.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <button
          onClick={() => router.push("/app/settings")}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition ${
            pathname === "/app/settings"
              ? "bg-violet-500/20 text-violet-300"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="w-8 border-t border-slate-800 my-1" />
          <div
            className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300"
            title={user?.email}
          >
            {(user?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
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

  // ═══════════════════════════════════════════════════════════
  // EXPANDED MODE — full sidebar
  // ═══════════════════════════════════════════════════════════
  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen">
      {/* Brand + Notifications + Collapse toggle */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
            Xentra AI
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your AI Operating Assistant
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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

      <UserStats />

      {/* Primary actions */}
      <div className="p-3 space-y-2 border-b border-slate-800 shrink-0">
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

      {/* Bees */}
      <div className="border-b border-slate-800 shrink-0">
        <button
          onClick={() => router.push("/app/bees")}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition ${
            pathname?.startsWith("/app/bees")
              ? "bg-violet-500/10 text-violet-300 border-l-2 border-violet-500"
              : "text-slate-300 hover:bg-slate-900"
          }`}
        >
          <span className="text-base leading-none">🐝</span>
          <span className="flex-1 text-left">Bees</span>
          {hive && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                hive.busy
                  ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  : "border-slate-700 text-slate-400 bg-slate-900"
              }`}
            >
              {hive.active}/{hive.quota}
            </span>
          )}
        </button>

        {hive && hive.bees.length > 0 && (
          <div className="px-3 pb-3">
            <div className="grid grid-cols-5 gap-1.5">
              {HIVE_SHOWCASE.map((t) => {
                const bee = hive.bees.find(
                  (b: { type: string }) => b.type === t
                );
                const pct = bee?.progress ?? 0;
                const style = BEE_STYLE[t];
                return (
                  <button
                    key={t}
                    onClick={() => router.push("/app/bees")}
                    className="flex flex-col items-center gap-1 group"
                    title={style.label}
                  >
                    <div className="relative">
                      <BeeIcon type={t} size={28} />
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 whitespace-nowrap">
                        {bee ? `${pct}%` : "idle"}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 group-hover:text-slate-300">
                      {style.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

            {/* Study (collapsible) */}
      <div className="border-b border-slate-800 shrink-0">
        <div className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-900 transition">
  <button
    onClick={() => router.push("/app/learn")}
    className={`flex items-center gap-2 flex-1 text-left ${
      pathname?.startsWith("/app/learn") ? "text-violet-300" : ""
    }`}
  >
       <GraduationCap className="w-3.5 h-3.5" />
          <span>Study</span>
           </button>
        <button
        onClick={() => setShowStudy(!showStudy)}
      className="p-1 rounded hover:bg-slate-800"
         aria-label="Toggle study section"
         >
          {showStudy ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
           </button>
          </div>

        {showStudy && (
          <div className="px-3 pb-3 space-y-1">
            {/* Direct subject links */}
            {STUDY_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    active
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}

            {/* Study Tools (nested collapsible) */}
            <button
              onClick={() => setShowStudyTools(!showStudyTools)}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Study Tools</span>
              {showStudyTools ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {showStudyTools && (
              <div className="pl-4 space-y-0.5">
                {STUDY_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const active = pathname === tool.path;
                  return (
                    <button
                      key={tool.path}
                      onClick={() => router.push(tool.path)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] transition ${
                        active
                          ? "bg-violet-500/20 text-violet-300"
                          : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Other study links */}
            {STUDY_MORE.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    active
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tools (collapsible) */}
      <div className="border-b border-slate-800 shrink-0">
        <button
          onClick={() => setShowTools(!showTools)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-900 transition"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Tools ({TOOLS.length})</span>
          {showTools ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {showTools && (
          <div className="px-3 pb-3 space-y-1.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const active = pathname === tool.path;
              return (
                <button
                  key={tool.path}
                  onClick={() => router.push(tool.path)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="border-b border-slate-800 shrink-0">
        <button
          onClick={() => router.push("/app/system-health")}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition ${
            pathname?.startsWith("/app/system-health")
              ? "bg-violet-500/10 text-violet-300 border-l-2 border-violet-500"
              : "text-slate-300 hover:bg-slate-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="flex-1 text-left">System Health</span>
        </button>
      </div>

      {/* Security (collapsible) */}
      <div className="border-b border-slate-800 shrink-0">
        <button
          onClick={() => setShowSecurity(!showSecurity)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-900 transition"
        >
          <Shield className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Security</span>
          {showSecurity ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {showSecurity && (
          <div className="px-3 pb-3 space-y-1.5">
            {SECURITY.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin */}
      {user?.is_admin && (
        <div className="border-b border-slate-800 shrink-0">
          <button
            onClick={() => router.push("/app/admin")}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-violet-400 uppercase tracking-wider hover:bg-violet-500/10 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Admin</span>
          </button>
        </div>
      )}

      {/* Tasks (foldable) */}
      {tasks.length > 0 && (
        <div className="border-b border-slate-800 shrink-0">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-900 transition"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">
              Tasks ({tasks.filter((t) => t.status === "running").length} running)
            </span>
            {showTasks ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {showTasks && (
            <div className="p-3 pt-0 space-y-1 max-h-48 overflow-y-auto">
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
          )}
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
      <div className="border-t border-slate-800 p-3 shrink-0">
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 truncate">
              Signed in as
            </div>
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

      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
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