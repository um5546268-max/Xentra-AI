"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Rocket,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  listPlans,
  getBillingStatus,
  startCheckout,
  formatPrice,
  metricLabel,
  usageColor,
  Plan,
  BillingStatus,
} from "@/lib/billing";

const PLAN_ICONS: Record<string, any> = {
  free: Zap,
  pro: Rocket,
};

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([listPlans(), getBillingStatus()]);
      setPlans(p);
      setStatus(s);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpgrade = async (planSlug: string) => {
    setCheckingOut(planSlug);
    setError(null);
    try {
      const res = await startCheckout(planSlug);
      if (res.status === "not_implemented") {
        alert(
          "Payment integration coming Day 81.\n\nPlan: " +
            res.plan_slug +
            "\nPrice: $" +
            (res.price_cents / 100).toFixed(2)
        );
      } else if (res.url) {
        window.location.href = res.url;
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message);
    } finally {
      setCheckingOut(null);
    }
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
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Billing</h1>
            <p className="text-sm text-slate-500">
              Manage your plan and view usage.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current plan */}
        {status && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  {(() => {
                    const Icon = PLAN_ICONS[status.plan.slug] || Sparkles;
                    return <Icon className="w-5 h-5 text-violet-300" />;
                  })()}
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    Current plan
                  </div>
                  <div className="text-lg font-semibold text-slate-100">
                    {status.plan.name}
                  </div>
                </div>
              </div>

              {status.plan.slug === "free" ? (
                <button
                  onClick={() => handleUpgrade("pro")}
                  disabled={checkingOut === "pro"}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 flex items-center gap-2"
                >
                  {checkingOut === "pro" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Upgrade to Pro
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-1 font-medium uppercase tracking-wider">
                    Active
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Status: {status.subscription.status}
              {status.subscription.current_period_end && (
                <>
                  {" · Renews "}
                  {new Date(
                    status.subscription.current_period_end
                  ).toLocaleDateString()}
                </>
              )}
            </div>
          </div>
        )}

        {/* Usage dashboard */}
        {status && Object.keys(status.usage).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Today's usage
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(status.usage).map(([key, metric]) => {
                const unlimited = metric.limit === -1;
                const pct = unlimited
                  ? 0
                  : Math.min(100, (metric.used / metric.limit) * 100);

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {metricLabel(key)}
                      </span>
                      <span className="font-mono text-slate-500">
                        {unlimited
                          ? "unlimited"
                          : `${metric.used} / ${metric.limit}`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${usageColor(
                          metric.used,
                          metric.limit
                        )}`}
                        style={{ width: unlimited ? "0%" : `${pct}%` }}
                      />
                    </div>
                    {!unlimited && metric.remaining <= 3 && (
                      <div className="text-[11px] text-yellow-400">
                        Only {metric.remaining} left today
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plan comparison */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Available plans
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isCurrent = status?.plan.slug === plan.slug;
              const isPro = plan.slug === "pro";
              const Icon = PLAN_ICONS[plan.slug] || Sparkles;
              const limits = plan.limits || {};

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-6 space-y-4 transition ${
                    isPro
                      ? "border-violet-500/40 bg-violet-500/5"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`w-5 h-5 ${
                          isPro ? "text-violet-300" : "text-slate-300"
                        }`}
                      />
                      <span className="text-base font-semibold text-slate-100">
                        {plan.name}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        Current
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-3xl font-bold text-slate-100">
                      {formatPrice(plan.price_cents, plan.currency)}
                    </div>
                    {plan.price_cents > 0 && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        per {plan.interval}
                      </div>
                    )}
                  </div>

                  {plan.description && (
                    <div className="text-xs text-slate-400">
                      {plan.description}
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    {[
                      "messages_per_day",
                      "tasks_per_day",
                      "images_per_day",
                      "voice_minutes_per_day",
                      "automations_max",
                      "integrations_max",
                    ].map((key) => {
                      const value = limits[key];
                      if (value === undefined) return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-xs text-slate-400"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="flex-1">{metricLabel(key)}</span>
                          <span className="font-mono text-slate-300">
                            {value === -1 ? "unlimited" : value.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!isCurrent && plan.price_cents > 0 && (
                    <button
                      onClick={() => handleUpgrade(plan.slug)}
                      disabled={checkingOut === plan.slug}
                      className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {checkingOut === plan.slug ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4" />
                      )}
                      Upgrade to {plan.name}
                    </button>
                  )}

                  {isCurrent && plan.price_cents > 0 && (
                    <button
                      disabled
                      className="w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    >
                      Current plan
                    </button>
                  )}

                  {plan.price_cents === 0 && isCurrent && (
                    <div className="w-full text-center text-xs text-slate-500 py-2">
                      You're on the Free plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
          💳 Payments powered by Stripe (coming Day 81). Plans and usage are
          fully tracked today — you can upgrade the moment checkout is
          connected.
        </div>
      </div>
    </div>
  );
}