"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Check,
  X,
  Loader2,
  AlertCircle,
  Inbox,
  Shield,
} from "lucide-react";
import api from "@/lib/api";

type PendingAction = {
  id: string;
  action: string;
  scope: string | null;
  tier: string | null;
  payload: Record<string, any> | null;
  summary: string;
  source: string;
  status: string;
  resolved_at: string | null;
  resolution_note: string | null;
  result: Record<string, any> | null;
  error: string | null;
  expires_at: string;
  created_at: string;
};

export default function PendingPage() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === "pending" ? { status: "pending" } : {};
      const res = await api.get("/api/pending-actions", { params });
      setActions(res.data.actions);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [filter]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.post(`/api/pending-actions/${id}/approve`);
      setInfo("Approved and executed");
      setTimeout(() => setInfo(null), 2500);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await api.post(`/api/pending-actions/${id}/deny`, {
        note: denyNote[id] || null,
      });
      setInfo("Denied");
      setTimeout(() => setInfo(null), 2000);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = actions.filter((a) => a.status === "pending").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Pending Actions</h1>
            <p className="text-sm text-slate-500">
              Actions waiting for your approval before running.
            </p>
          </div>
          <div className="flex gap-1">
            <FilterBtn
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
              label={`Pending (${pendingCount})`}
            />
            <FilterBtn
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="All"
            />
          </div>
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
            <Check className="w-4 h-4" />
            {info}
          </div>
        )}

        {/* List */}
        {loading && actions.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Inbox className="w-12 h-12 mx-auto text-slate-700" />
            <div className="text-sm text-slate-500">
              {filter === "pending"
                ? "No pending actions. Everything is approved."
                : "No actions yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((a) => (
              <ActionCard
                key={a.id}
                action={a}
                processing={processingId === a.id}
                denyNote={denyNote[a.id] || ""}
                onDenyNoteChange={(v) =>
                  setDenyNote((prev) => ({ ...prev, [a.id]: v }))
                }
                onApprove={() => handleApprove(a.id)}
                onDeny={() => handleDeny(a.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
        active
          ? "border-violet-500 bg-violet-500/20 text-violet-300"
          : "border-slate-700 text-slate-400 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function ActionCard({
  action,
  processing,
  denyNote,
  onDenyNoteChange,
  onApprove,
  onDeny,
}: {
  action: PendingAction;
  processing: boolean;
  denyNote: string;
  onDenyNoteChange: (v: string) => void;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const isPending = action.status === "pending";
  const expiresIn = Math.max(
    0,
    Math.floor((new Date(action.expires_at).getTime() - Date.now()) / 1000 / 60)
  );

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        isPending
          ? "border-yellow-500/40 bg-yellow-500/5"
          : action.status === "executed"
          ? "border-emerald-500/40 bg-emerald-500/5"
          : action.status === "denied"
          ? "border-red-500/40 bg-red-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isPending
              ? "bg-yellow-500/20 text-yellow-300"
              : action.status === "executed"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-slate-500/20 text-slate-400"
          }`}
        >
          <Shield className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">
              {action.summary}
            </span>
            <span className="rounded border border-slate-700 text-slate-400 text-[10px] uppercase px-1.5 py-0.5">
              {action.action}
            </span>
            <StatusBadge status={action.status} />
          </div>

          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>Source: {action.source}</span>
            {isPending && (
              <span className="text-yellow-400">
                Expires in ~{expiresIn} min
              </span>
            )}
            {action.resolved_at && (
              <span>Resolved: {new Date(action.resolved_at).toLocaleString()}</span>
            )}
          </div>

          {action.resolution_note && (
            <div className="text-xs text-slate-400 italic">
              Note: {action.resolution_note}
            </div>
          )}
          {action.error && (
            <div className="text-xs text-red-400">
              Error: {action.error}
            </div>
          )}
        </div>
      </div>

      {isPending && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <input
            value={denyNote}
            onChange={(e) => onDenyNoteChange(e.target.value)}
            placeholder="Optional note when denying"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={processing}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve & run
            </button>
            <button
              onClick={onDeny}
              disabled={processing}
              className="flex-1 rounded-lg border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Deny
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "PENDING", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
    approved: { label: "APPROVED", className: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    denied: { label: "DENIED", className: "bg-red-500/20 text-red-300 border-red-500/40" },
    executed: { label: "EXECUTED", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
    failed: { label: "FAILED", className: "bg-red-500/20 text-red-300 border-red-500/40" },
    expired: { label: "EXPIRED", className: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
  };
  const cfg = map[status] || map.pending;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}