"use client";

import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

export type PendingPermission = {
  id: string;
  risk: "low" | "medium" | "high";
  action: string;
  detail?: string | null;
};

export function PermissionModal({
  perm,
  onGrant,
  onDeny,
}: {
  perm: PendingPermission | null;
  onGrant: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  if (!perm) return null;

  const meta = {
    low: {
      icon: ShieldCheck,
      title: "Low risk action",
      color: "text-emerald-300",
      border: "border-emerald-500/40",
    },
    medium: {
      icon: AlertTriangle,
      title: "Medium risk — confirmation needed",
      color: "text-amber-300",
      border: "border-amber-500/40",
    },
    high: {
      icon: ShieldAlert,
      title: "High risk action",
      color: "text-red-300",
      border: "border-red-500/40",
    },
  }[perm.risk];

  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className={`relative bg-slate-950 border ${meta.border} rounded-2xl p-5 w-full max-w-md`}
      >
        <div className={`flex items-center gap-2 mb-3 ${meta.color}`}>
          <Icon className="w-5 h-5" />
          <span className="text-sm font-semibold">{meta.title}</span>
        </div>

        <div className="text-xs text-slate-300 mb-1">
          A Bee is requesting permission to:
        </div>
        <div className="text-sm text-slate-100 font-mono mb-3">
          {perm.action}
        </div>
        {perm.detail && (
          <div className="text-xs text-slate-400 mb-4">{perm.detail}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => onDeny(perm.id)}
            className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Deny
          </button>
          <button
            onClick={() => onGrant(perm.id)}
            className="px-3 py-1.5 text-xs rounded bg-violet-600 hover:bg-violet-500 text-white"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}