"use client";

import { Users as UsersIcon, Flag, Megaphone, Activity as ActivityIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  MessageSquare,
  ListTodo,
  Image as ImageIcon,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Search,
  Zap,
  TrendingUp,
  Activity,
  X,
} from "lucide-react";
import {
  getAdminStats,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  AdminStats,
  AdminUser,
  metricLabel,
  timeAgo,
} from "@/lib/admin";
import { useAuth } from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "users" | "flags" | "announcements">("overview");

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [s, u] = await Promise.all([
        getAdminStats(),
        getAdminUsers({ search: search || undefined, limit: 200 }),
      ]);
      setStats(s);
      setUsers(u.users);
      setError(null);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        router.push("/app");
        return;
      }
      setError(e?.response?.data?.detail || e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [search]);

  const handleToggleAdmin = async (u: AdminUser) => {
    if (!confirm(
      u.is_admin
        ? `Remove admin rights from ${u.email}?`
        : `Make ${u.email} an admin?`
    )) return;

    try {
      const updated = await updateAdminUser(u.id, { is_admin: !u.is_admin });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      setInfo(`${u.email} ${updated.is_admin ? "promoted" : "demoted"}`);
      setTimeout(() => setInfo(null), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
  };

  const handleToggleEmergency = async (u: AdminUser) => {
    const verb = u.emergency_stop ? "Clear emergency stop for" : "Emergency stop";
    if (!confirm(`${verb} ${u.email}?`)) return;

    try {
      const updated = await updateAdminUser(u.id, {
        emergency_stop: !u.emergency_stop,
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
      setInfo(
        `${u.email}: emergency stop ${updated.emergency_stop ? "activated" : "cleared"}`
      );
      setTimeout(() => setInfo(null), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(
      `Permanently delete ${u.email}?\n\nThis removes all their conversations, files, memories, and data. Cannot be undone.`
    )) return;

    try {
      await deleteAdminUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setInfo(`Deleted ${u.email}`);
      setTimeout(() => setInfo(null), 2000);
      await load(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">
              System overview and user management.
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

                {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800">
          <Tab
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<ActivityIcon className="w-3.5 h-3.5" />}
            label="Overview"
          />
          <Tab
            active={tab === "users"}
            onClick={() => setTab("users")}
            icon={<UsersIcon className="w-3.5 h-3.5" />}
            label={`Users (${users.length})`}
          />
          <Tab
            active={tab === "flags"}
            onClick={() => setTab("flags")}
            icon={<Flag className="w-3.5 h-3.5" />}
            label="Feature flags"
          />
          <Tab
            active={tab === "announcements"}
            onClick={() => setTab("announcements")}
            icon={<Megaphone className="w-3.5 h-3.5" />}
            label="Announcements"
          />
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {info}
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total users"
                value={stats.total_users}
                sub={`${stats.new_users_7d} new this week`}
                icon={Users}
                color="violet"
              />
              <StatCard
                label="Active (7d)"
                value={stats.active_users_7d}
                sub="users with activity"
                icon={TrendingUp}
                color="emerald"
              />
              <StatCard
                label="Conversations"
                value={stats.total_conversations}
                sub={`${stats.total_messages} messages`}
                icon={MessageSquare}
                color="blue"
              />
              <StatCard
                label="Tasks"
                value={stats.total_tasks}
                sub={`${stats.tasks_running} running`}
                icon={ListTodo}
                color="orange"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Images"
                value={stats.total_images}
                sub="generated total"
                icon={ImageIcon}
                color="pink"
              />
              <StatCard
                label="Files"
                value={stats.total_files}
                sub="uploaded total"
                icon={FileText}
                color="cyan"
              />
              <StatCard
                label="Automations"
                value={stats.total_automations}
                sub={`${stats.automations_enabled} enabled`}
                icon={Clock}
                color="yellow"
              />
              <StatCard
                label="Messages (24h)"
                value={stats.usage_last_24h.messages || 0}
                sub="all users"
                icon={Zap}
                color="red"
              />
            </div>
          </>
        )}

        {/* Usage (last 24h) */}
        {stats && Object.keys(stats.usage_last_24h).length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <div className="text-sm font-medium text-slate-200">
              Usage (last 24h)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.usage_last_24h).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg bg-slate-950/40 px-3 py-2"
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    {metricLabel(key)}
                  </div>
                  <div className="text-lg font-mono text-slate-200">
                    {value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">
                Users · {users.length}
              </span>
            </div>
            <form onSubmit={onSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email…"
                className="rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none w-64"
              />
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Joined</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-900/40 transition"
                  >
                    <td className="px-4 py-3 text-slate-200">
                      <div className="flex items-center gap-2">
                        {u.email}
                        {u.is_admin && (
                          <span className="rounded bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[9px] font-semibold uppercase px-1.5 py-0.5">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {u.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {timeAgo(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {u.emergency_stop ? (
                        <span className="rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-medium px-2 py-0.5">
                          🛑 Stopped
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium px-2 py-0.5">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleToggleAdmin(u)}
                          disabled={u.id === user?.id}
                          title={
                            u.is_admin ? "Remove admin" : "Make admin"
                          }
                          className={`p-1.5 rounded hover:bg-slate-800 transition ${
                            u.is_admin
                              ? "text-violet-400"
                              : "text-slate-500 hover:text-violet-400"
                          } disabled:opacity-30`}
                        >
                          {u.is_admin ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleEmergency(u)}
                          title={
                            u.emergency_stop
                              ? "Clear emergency stop"
                              : "Emergency stop"
                          }
                          className={`p-1.5 rounded hover:bg-slate-800 transition ${
                            u.emergency_stop
                              ? "text-red-400"
                              : "text-slate-500 hover:text-red-400"
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={u.id === user?.id}
                          title="Delete user"
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No users match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "violet",
}: {
  label: string;
  value: number;
  sub?: string;
  icon: any;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/30",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    blue: "text-blue-300 bg-blue-500/10 border-blue-500/30",
    orange: "text-orange-300 bg-orange-500/10 border-orange-500/30",
    pink: "text-pink-300 bg-pink-500/10 border-pink-500/30",
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
    yellow: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30",
    red: "text-red-300 bg-red-500/10 border-red-500/30",
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center border ${
            colorMap[color] || colorMap.violet
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100 mt-1">
        {value.toLocaleString()}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${
        active
          ? "border-violet-500 text-violet-300"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}