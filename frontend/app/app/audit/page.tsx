"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  Loader2,
  RefreshCw,
  Filter,
} from "lucide-react";
import api from "@/lib/api";

type AuditLog = {
  id: string;
  action: string;
  scope: string | null;
  tier: string | null;
  status: string;
  source: string;
  summary: string | null;
  error: string | null;
  reversible: boolean;
  created_at: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [limit, setLimit] = useState(100);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit };
      if (actionFilter) params.action = actionFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/api/audit", { params });
      setLogs(res.data.logs);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [actionFilter, statusFilter, limit]);

  const statusColor = (s: string) => {
    if (s === "success") return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (s === "failed") return "text-red-400 border-red-500/40 bg-red-500/10";
    if (s === "denied") return "text-red-400 border-red-500/40 bg-red-500/10";
    if (s === "pending") return "text-yellow-400 border-yellow-500/40 bg-yellow-500/10";
    return "text-slate-400 border-slate-500/40 bg-slate-500/10";
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 border border-slate-500/40 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-slate-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Audit Log</h1>
            <p className="text-sm text-slate-500">
              Every important action Xentra has taken.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action (e.g. browser.open)"
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none w-72"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="denied">Denied</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No audit log entries match your filters.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 flex items-center gap-3 hover:border-slate-700 transition"
              >
                <span className="font-mono text-[11px] text-slate-500 shrink-0 w-32">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                <span className="font-mono text-xs text-slate-400 shrink-0 w-40 truncate">
                  {log.action}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${statusColor(
                    log.status
                  )}`}
                >
                  {log.status}
                </span>
                <span className="text-sm text-slate-300 truncate flex-1">
                  {log.summary || "—"}
                </span>
                {log.source && (
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                    {log.source}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}