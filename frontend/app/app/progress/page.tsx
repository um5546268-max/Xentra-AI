"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, Star, Flame, Layers, HelpCircle, StickyNote, Target, Loader2,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getProgressStats, ProgressStats } from "@/lib/progress";

const SUBJECT_COLORS: Record<string, string> = {
  languages: "#8b5cf6",
  school: "#06b6d4",
  programming: "#10b981",
  science: "#f59e0b",
  personal: "#ec4899",
  other: "#64748b",
};

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    setLoading(true);
    getProgressStats(range)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm">
        Failed to load progress.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Progress</h1>
              <p className="text-sm text-slate-500">
                Your learning journey over time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  range === d
                    ? "bg-violet-600 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Star className="w-4 h-4 text-yellow-400" />}
            label="Total Points"
            value={stats.totals.points}
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-orange-400" />}
            label="Streak"
            value={`${stats.totals.streak_days}d`}
            accent
          />
          <StatCard
            icon={<Layers className="w-4 h-4 text-violet-400" />}
            label="Sessions"
            value={stats.totals.sessions}
          />
          <StatCard
            icon={<HelpCircle className="w-4 h-4 text-cyan-400" />}
            label="Quizzes Taken"
            value={stats.totals.quizzes}
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={<Layers className="w-3.5 h-3.5" />} label="Flashcards" value={stats.totals.flashcards} />
          <MiniStat icon={<StickyNote className="w-3.5 h-3.5" />} label="Notes" value={stats.totals.notes} />
          <MiniStat icon={<Target className="w-3.5 h-3.5" />} label="Goals" value={stats.totals.goals} />
        </div>

        {/* Points line chart */}
        <ChartCard title="Points earned" subtitle={`Last ${range} days`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.daily_points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#475569"
                fontSize={10}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis stroke="#475569" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sessions bar chart */}
        <ChartCard title="Sessions per week" subtitle="Last 12 weeks">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weekly_sessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" stroke="#475569" fontSize={10} />
              <YAxis stroke="#475569" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sessions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Subject breakdown */}
        {stats.subject_breakdown.length > 0 && (
          <ChartCard title="Subject breakdown" subtitle="Sessions by subject">
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.subject_breakdown}
                    dataKey="count"
                    nameKey="subject"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {stats.subject_breakdown.map((s) => (
                      <Cell
                        key={s.subject}
                        fill={SUBJECT_COLORS[s.subject] ?? "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex-1 space-y-2">
                {stats.subject_breakdown.map((s) => (
                  <div key={s.subject} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ background: SUBJECT_COLORS[s.subject] ?? "#64748b" }}
                    />
                    <span className="capitalize flex-1">{s.subject}</span>
                    <span className="font-mono text-slate-500">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {/* Heatmap */}
        <ChartCard title="Activity heatmap" subtitle="Last 365 days">
          <Heatmap data={stats.heatmap} />
        </ChartCard>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Components
// ───────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-violet-500/40 bg-violet-500/5" : "border-slate-800 bg-slate-900/40"}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 flex items-center gap-2">
      <div className="text-slate-500">{icon}</div>
      <div className="flex-1 text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function ChartCard({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-medium text-slate-200">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex gap-[2px] overflow-x-auto pb-1">
      {data.map((d) => {
        const intensity = d.count === 0 ? 0 : Math.ceil((d.count / max) * 4);
        const colors = [
          "bg-slate-800",
          "bg-violet-900",
          "bg-violet-700",
          "bg-violet-500",
          "bg-violet-400",
        ];
        return (
          <div
            key={d.date}
            className={`w-[10px] h-[10px] rounded-sm ${colors[intensity]} shrink-0`}
            title={`${d.date}: ${d.count} ${d.count === 1 ? "session" : "sessions"}`}
          />
        );
      })}
    </div>
  );
}