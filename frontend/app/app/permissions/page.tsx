"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Loader2,
  AlertCircle,
  Check,
  X,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  listPermissions,
  updatePermissions,
  resetPermissions,
  Permission,
  tierMeta,
  scopeLabel,
} from "@/lib/permissions";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPermissions();
      setPermissions(res.permissions);
      setSummary(res.summary);
      setDrafts({});
      // Open all scopes by default
      const opened: Record<string, boolean> = {};
      res.permissions.forEach((p) => (opened[p.scope] = true));
      setOpenScopes(opened);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasChanges = Object.keys(drafts).length > 0;

  const togglePermission = (key: string, currentEnabled: boolean) => {
    const newValue = !currentEnabled;
    setDrafts((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = Object.entries(drafts).map(([key, enabled]) => ({
        key,
        enabled,
      }));
      await updatePermissions(updates);
      setInfo(`Saved ${updates.length} change${updates.length !== 1 ? "s" : ""}`);
      setTimeout(() => setInfo(null), 2500);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all permissions to defaults?")) return;
    try {
      await resetPermissions();
      setInfo("Permissions reset to defaults");
      setTimeout(() => setInfo(null), 2500);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  // Group permissions by scope
  const byScope = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      if (!groups[p.scope]) groups[p.scope] = [];
      groups[p.scope].push(p);
    });
    return groups;
  }, [permissions]);

  const getDraftValue = (key: string, current: boolean) => {
    return key in drafts ? drafts[key] : current;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Permissions</h1>
            <p className="text-sm text-slate-500">
              Control what Xentra is allowed to do.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
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

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <TierCard tier="low" stats={summary.by_tier.low} />
            <TierCard tier="medium" stats={summary.by_tier.medium} />
            <TierCard tier="high" stats={summary.by_tier.high} />
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byScope).map(([scope, perms]) => {
              const open = openScopes[scope] !== false;
              const enabledCount = perms.filter(
                (p) => getDraftValue(p.key, p.enabled)
              ).length;

              return (
                <div
                  key={scope}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden"
                >
                  {/* Scope header */}
                  <button
                    onClick={() =>
                      setOpenScopes((prev) => ({
                        ...prev,
                        [scope]: !open,
                      }))
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-900/60 transition"
                  >
                    {open ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-medium text-slate-200">
                      {scopeLabel(scope)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {enabledCount}/{perms.length} enabled
                    </span>
                  </button>

                  {/* Permissions list */}
                  {open && (
                    <div className="border-t border-slate-800 divide-y divide-slate-800">
                      {perms.map((p) => {
                        const value = getDraftValue(p.key, p.enabled);
                        const meta = tierMeta(p.tier);
                        const isDraft = p.key in drafts;

                        return (
                          <div
                            key={p.key}
                            className={`flex items-center gap-4 px-4 py-3 ${
                              isDraft ? "bg-yellow-500/5" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-slate-200">
                                  {p.label}
                                </span>
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.bg} ${meta.color}`}
                                >
                                  {meta.emoji} {p.tier}
                                </span>
                                {isDraft && (
                                  <span className="rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] px-1.5 py-0.5 font-medium">
                                    unsaved
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {p.description}
                              </div>
                            </div>

                            <button
                              onClick={() => togglePermission(p.key, value)}
                              className={`relative shrink-0 w-11 h-6 rounded-full transition ${
                                value ? "bg-emerald-500" : "bg-slate-700"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                  value ? "translate-x-5" : ""
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/40 bg-slate-950 shadow-2xl px-4 py-3">
            <span className="text-sm text-yellow-300">
              {Object.keys(drafts).length} unsaved change
              {Object.keys(drafts).length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setDrafts({})}
              className="text-xs text-slate-400 hover:text-slate-200 px-2"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TierCard({ tier, stats }: { tier: string; stats: { on: number; off: number } }) {
  const meta = tierMeta(tier);
  return (
    <div className={`rounded-lg border p-3 ${meta.bg}`}>
      <div className={`text-xs font-medium uppercase tracking-wider ${meta.color}`}>
        {meta.emoji} {meta.label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-200">{stats.on}</span>
        <span className="text-xs text-slate-500">enabled</span>
        {stats.off > 0 && (
          <span className="text-xs text-slate-600">· {stats.off} off</span>
        )}
      </div>
    </div>
  );
}