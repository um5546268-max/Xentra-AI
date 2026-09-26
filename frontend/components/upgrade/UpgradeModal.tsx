"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, X, Sparkles } from "lucide-react";

type LimitDetail = {
  error: string;
  metric: string;
  plan: string;
  limit: number;
  used: number;
  upgrade_url: string;
  message: string;
};

export default function UpgradeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<LimitDetail | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      setDetail(e.detail);
      setOpen(true);
    };
    window.addEventListener("limit:reached", handler);
    return () => window.removeEventListener("limit:reached", handler);
  }, []);

  if (!open || !detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-w-md w-full rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-violet-950/40 to-slate-900 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="font-semibold text-lg">You've hit your limit</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-slate-300 leading-relaxed">
          {detail.message}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Your plan</span>
            <span className="text-slate-200 capitalize">{detail.plan}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Metric</span>
            <span className="text-slate-200 capitalize">
              {detail.metric.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Used today</span>
            <span className="text-slate-200 font-mono">
              {detail.used} / {detail.limit}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setOpen(false);
              router.push(detail.upgrade_url || "/app/billing");
            }}
            className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-500 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Now
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}