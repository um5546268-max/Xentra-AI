"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Crown, Check, Sparkles, Zap, Shield, CreditCard, Plus,
  TrendingUp, MessageSquare, FolderOpen, Bot, GraduationCap,
  Copy, CheckCircle2, ChevronRight, Loader2, X, FileText,
} from "lucide-react";
import {
  listPlans, getBillingStatus, startCheckout,
  Plan, BillingStatus,
  formatPrice, metricLabel, usageColor,
} from "@/lib/billing";
import { useAuth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// SHORT CARD FEATURES (per plan)
// ─────────────────────────────────────────────────────────────
const CARD_FEATURES: Record<string, string[]> = {
  free: [
    "💬 AI Chat — Unlimited",
    "🌐 Search — 3/day",
    "🔬 Deep Research — 3/day",
    "💻 Coding — Unlimited",
    "🤖 AI Coding — 5/day",
    "📁 File uploads — 3/day",
    "🎓 Learning — 2 h/day",
    "🤖 Connect AI — 30 min/day",
  ],
  basic: [
    "💬 AI Chat — Unlimited",
    "🌐 Search — 15/day",
    "🔬 Deep Research — 10/day",
    "💻 Coding — Unlimited",
    "🤖 AI Coding — 15/day",
    "📁 File uploads — 10/day",
    "🎓 Learning — 5 h/day",
    "🤖 Connect AI — 2 h/day",
  ],
  premium: [
    "💬 AI Chat — Unlimited",
    "🌐 Search — 50/day",
    "🔬 Deep Research — 30/day",
    "💻 Coding — Unlimited",
    "🤖 AI Coding — 50/day",
    "📁 File uploads — 30/day",
    "🎓 Learning — 10 h/day",
    "🤖 Connect AI — 5 h/day",
  ],
  ultimate: [
    "💬 AI Chat — Unlimited",
    "🌐 Search — 150/day",
    "🔬 Deep Research — 100/day",
    "💻 Coding — Unlimited",
    "🤖 AI Coding — 150/day",
    "📁 File uploads — 100/day",
    "🎓 Learning — Unlimited*",
    "🤖 Connect AI — 10 h/day",
  ],
};

// ─────────────────────────────────────────────────────────────
// FULL COMPARISON TABLE
// ─────────────────────────────────────────────────────────────
type FeatureRow = {
  label: string;
  free: string;
  basic: string;
  premium: string;
  ultimate: string;
  highlight?: boolean;
};

const COMPARISON_ROWS: FeatureRow[] = [
  { label: "💰 Price", free: "$0", basic: "$4.99/mo", premium: "$9.99/mo", ultimate: "$19.99/mo", highlight: true },
  { label: "💬 AI Chat", free: "♾️ Unlimited", basic: "♾️ Unlimited", premium: "♾️ Unlimited", ultimate: "♾️ Unlimited" },
  { label: "🌐 Search", free: "3/day", basic: "15/day", premium: "50/day", ultimate: "150/day" },
  { label: "🔬 Deep Research", free: "3/day", basic: "10/day", premium: "30/day", ultimate: "100/day" },
  { label: "💻 Coding", free: "♾️ Unlimited", basic: "♾️ Unlimited", premium: "♾️ Unlimited", ultimate: "♾️ Unlimited" },
  { label: "🤖 AI Coding", free: "5/day", basic: "15/day", premium: "50/day", ultimate: "150/day" },
  { label: "📁 File uploads", free: "3/day", basic: "10/day", premium: "30/day", ultimate: "100/day" },
  { label: "🎓 Learning", free: "2 h/day", basic: "5 h/day", premium: "10 h/day", ultimate: "Unlimited*" },
  { label: "🛒 Shopping", free: "3/day", basic: "10/day", premium: "30/day", ultimate: "100/day" },
  { label: "🌐 Browser tasks", free: "3/day", basic: "10/day", premium: "30/day", ultimate: "100/day" },
  { label: "💬 Xentra Connect", free: "♾️ Unlimited", basic: "♾️ Unlimited", premium: "♾️ Unlimited", ultimate: "♾️ Unlimited" },
  { label: "🤖 Connect AI", free: "30 min/day", basic: "2 h/day", premium: "5 h/day", ultimate: "10 h/day" },
  { label: "🧠 Save Memory", free: "1/day", basic: "5/day", premium: "15/day", ultimate: "50/day" },
  { label: "🖥️ System Health", free: "Basic", basic: "Full", premium: "Advanced", ultimate: "Advanced+" },
  { label: "⚡ Automations", free: "2/day", basic: "10/day", premium: "30/day", ultimate: "100/day" },
  { label: "🎵 Media", free: "Basic", basic: "Advanced", premium: "Advanced+", ultimate: "Maximum" },
  { label: "🐝 Bee Hive", free: "❌ V1", basic: "❌ V1", premium: "❌ V1", ultimate: "❌ V1" },
];

// ─────────────────────────────────────────────────────────────
// FALLBACK PLANS
// ─────────────────────────────────────────────────────────────
const FALLBACK_PLANS: Plan[] = [
  { id: "free", slug: "free", name: "Free", description: "Perfect to get started", price_cents: 0, currency: "USD", interval: "month", limits: null, features: null, display_order: 1 },
  { id: "basic", slug: "basic", name: "Plus", description: "For regular users", price_cents: 499, currency: "USD", interval: "month", limits: null, features: null, display_order: 2 },
  { id: "premium", slug: "premium", name: "Pro", description: "For dedicated learners & creators", price_cents: 999, currency: "USD", interval: "month", limits: null, features: null, display_order: 3 },
  { id: "ultimate", slug: "ultimate", name: "Ultimate", description: "For professionals & power users", price_cents: 1999, currency: "USD", interval: "month", limits: null, features: null, display_order: 4 },
];

const PLAN_STYLES: Record<
  string,
  { gradient: string; border: string; badgeBg: string; badgeText: string; buttonBg: string; accent: string }
> = {
  free: {
    gradient: "from-slate-800/40 via-slate-900/20 to-slate-950/10",
    border: "border-slate-700/60",
    badgeBg: "bg-slate-700/50",
    badgeText: "text-slate-300",
    buttonBg: "bg-slate-800 hover:bg-slate-700 text-slate-300",
    accent: "text-slate-300",
  },
  basic: {
    gradient: "from-emerald-900/30 via-emerald-950/10 to-slate-950/10",
    border: "border-emerald-600/40",
    badgeBg: "bg-emerald-600/30",
    badgeText: "text-emerald-300",
    buttonBg: "bg-emerald-700 hover:bg-emerald-600 text-white",
    accent: "text-emerald-300",
  },
  premium: {
    gradient: "from-violet-700/40 via-violet-900/20 to-slate-950/10",
    border: "border-violet-500/60",
    badgeBg: "bg-violet-600",
    badgeText: "text-white",
    buttonBg: "bg-blue-600 hover:bg-blue-500 text-white",
    accent: "text-violet-300",
  },
  ultimate: {
    gradient: "from-amber-900/30 via-amber-950/10 to-slate-950/10",
    border: "border-amber-600/40",
    badgeBg: "bg-amber-600/30",
    badgeText: "text-amber-300",
    buttonBg: "bg-amber-600 hover:bg-amber-500 text-white",
    accent: "text-amber-300",
  },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Sparkles className="w-5 h-5 text-slate-300" />,
  basic: <Zap className="w-5 h-5 text-emerald-300" />,
  premium: <Crown className="w-5 h-5 text-violet-200" />,
  ultimate: <Crown className="w-5 h-5 text-amber-300" />,
};

const USAGE_ICONS: Record<string, React.ReactNode> = {
  messages_per_day: <MessageSquare className="w-4 h-4 text-violet-300" />,
  tasks_per_day: <Sparkles className="w-4 h-4 text-cyan-300" />,
  images_per_day: <Sparkles className="w-4 h-4 text-pink-300" />,
  files_storage_mb: <FolderOpen className="w-4 h-4 text-emerald-300" />,
  voice_minutes_per_day: <GraduationCap className="w-4 h-4 text-amber-300" />,
  automations_max: <Bot className="w-4 h-4 text-violet-300" />,
  learning_max: <GraduationCap className="w-4 h-4 text-cyan-300" />,
  ai_agents_max: <Bot className="w-4 h-4 text-amber-300" />,
  search: <Sparkles className="w-4 h-4 text-cyan-300" />,
  deep_research: <Sparkles className="w-4 h-4 text-violet-300" />,
  ai_coding: <Bot className="w-4 h-4 text-emerald-300" />,
  file_upload: <FolderOpen className="w-4 h-4 text-emerald-300" />,
  shopping: <Sparkles className="w-4 h-4 text-amber-300" />,
  browser_tasks: <Sparkles className="w-4 h-4 text-cyan-300" />,
  save_memory: <Sparkles className="w-4 h-4 text-pink-300" />,
  connect_ai_minutes: <Bot className="w-4 h-4 text-violet-300" />,
  learning_minutes: <GraduationCap className="w-4 h-4 text-amber-300" />,
};

// ─────────────────────────────────────────────────────────────
// INNER COMPONENT (uses useSearchParams — must be inside <Suspense>)
// ─────────────────────────────────────────────────────────────
function BillingPageInner() {
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [copied, setCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 8000);
    }
  }, [searchParams]);

  const reload = async () => {
    try {
      const [p, s] = await Promise.all([
        listPlans().catch(() => []),
        getBillingStatus().catch(() => null),
      ]);
      setPlans(mergeWithFallback(p));
      if (s) setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!successBanner) return;
    const t = setTimeout(() => reload(), 2000);
    return () => clearTimeout(t);
  }, [successBanner]);

  const currentSlug = status?.plan?.slug || "free";

  const handleChoosePlan = async (slug: string) => {
    if (slug === currentSlug) return;
    setCheckoutLoading(slug);
    try {
      const result = await startCheckout(slug);
      if (result.ok && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setInfoModal({
          title: "Could not start checkout",
          message: result.message || "There was an issue starting the payment. Please try again in a moment.",
        });
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText("XENTRA20");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.display_order - b.display_order),
    [plans],
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {successBanner && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-emerald-300">Payment successful!</div>
              <div className="text-sm text-emerald-200/80">
                Your plan is being upgraded. It may take a few seconds to reflect.
              </div>
            </div>
            <button
              onClick={() => setSuccessBanner(false)}
              className="ml-auto text-emerald-300/60 hover:text-emerald-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Billing</h1>
            <p className="text-sm text-slate-500">
              Manage your plan, payment methods, and usage.
            </p>
          </div>
        </div>

        {status && (
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-violet-800/10 to-slate-900 p-6">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
            <div className="relative flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-xl font-semibold">Your Plan: {status.plan.name}</h2>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-200 border border-violet-500/40">
                      {status.subscription.status || "active"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 max-w-md">
                    {status.subscription.current_period_end
                      ? `Renews on ${new Date(status.subscription.current_period_end).toLocaleDateString()}`
                      : "You're doing great! Keep exploring, learning and building with Xentra AI."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition flex items-center gap-2"
              >
                Manage Plan <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div id="plans" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold">Choose Your Plan</h2>
              <p className="text-sm text-slate-500">
                Select the perfect plan for your needs. Upgrade, downgrade, or cancel anytime.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  cycle === "monthly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                  cycle === "yearly" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/40">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {sortedPlans.map((p) => {
              const isCurrent = p.slug === currentSlug;
              const isPopular = p.slug === "premium";
              const styles = PLAN_STYLES[p.slug] || PLAN_STYLES.free;
              const priceCents = cycle === "yearly" ? Math.round(p.price_cents * 12 * 0.8) : p.price_cents;
              const features = CARD_FEATURES[p.slug] || [];

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.gradient} p-5 ${
                    isPopular ? "ring-2 ring-violet-500/50" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/30">
                        ⭐ Most Popular
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg ${styles.badgeBg} flex items-center justify-center`}>
                      {PLAN_ICONS[p.slug]}
                    </div>
                    <div className="text-base font-semibold">{p.name}</div>
                  </div>

                  {p.description && (
                    <div className="text-xs text-slate-400 mb-3">{p.description}</div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {formatPrice(priceCents, p.currency)}
                      </span>
                      {priceCents > 0 && (
                        <span className="text-xs text-slate-500">
                          /{cycle === "yearly" ? "year" : "month"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 mb-4">
                    {features.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleChoosePlan(p.slug)}
                    disabled={isCurrent || checkoutLoading === p.slug}
                    className={`w-full rounded-lg py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-slate-900/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                        : styles.buttonBg
                    }`}
                  >
                    {checkoutLoading === p.slug ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening…
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : p.price_cents === 0 ? (
                      "Downgrade"
                    ) : (
                      "Upgrade Now"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Compare All Features</h2>
            <p className="text-sm text-slate-500">See exactly what's included in each plan.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/60">
              <div className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Feature</div>
              <div className="p-3 text-center border-l border-slate-800">
                <div className="text-sm font-semibold text-slate-300">🆓 Free</div>
                <div className="text-[10px] text-slate-500 mt-0.5">$0</div>
              </div>
              <div className="p-3 text-center border-l border-slate-800">
                <div className="text-sm font-semibold text-emerald-300">🔵 Plus</div>
                <div className="text-[10px] text-slate-500 mt-0.5">$4.99/mo</div>
              </div>
              <div className="p-3 text-center border-l border-slate-800 bg-violet-500/5">
                <div className="text-sm font-semibold text-violet-300">🟣 Pro ⭐</div>
                <div className="text-[10px] text-slate-500 mt-0.5">$9.99/mo</div>
              </div>
              <div className="p-3 text-center border-l border-slate-800">
                <div className="text-sm font-semibold text-amber-300">👑 Ultimate</div>
                <div className="text-[10px] text-slate-500 mt-0.5">$19.99/mo</div>
              </div>
            </div>

            {COMPARISON_ROWS.map((row, idx) => (
              <div
                key={row.label}
                className={`grid grid-cols-5 border-b border-slate-800/60 last:border-b-0 ${
                  row.highlight ? "bg-slate-950/40" : idx % 2 === 0 ? "bg-slate-900/20" : ""
                }`}
              >
                <div className="p-3 text-xs text-slate-300 font-medium">{row.label}</div>
                <div className="p-3 text-center text-xs text-slate-400 border-l border-slate-800/60">
                  {renderCell(row.free, row.highlight)}
                </div>
                <div className="p-3 text-center text-xs text-slate-400 border-l border-slate-800/60">
                  {renderCell(row.basic, row.highlight)}
                </div>
                <div className="p-3 text-center text-xs text-slate-200 border-l border-slate-800/60 bg-violet-500/5 font-semibold">
                  {renderCell(row.premium, row.highlight, true)}
                </div>
                <div className="p-3 text-center text-xs text-slate-400 border-l border-slate-800/60">
                  {renderCell(row.ultimate, row.highlight)}
                </div>
              </div>
            ))}

            <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-500 text-center">
              * Unlimited Learning on Ultimate is subject to fair-use limits.
              <span className="mx-2">·</span>
              🐝 Bee Hive will be available in a future version.
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/10 via-slate-900 to-cyan-600/10 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🎁</div>
            <div>
              <div className="font-semibold text-slate-100">Special Offers for You</div>
              <div className="text-sm text-slate-400 mt-0.5">
                Get <span className="text-violet-300 font-semibold">20% OFF</span> on your next upgrade! Use the code{" "}
                <span className="font-mono font-bold text-violet-300">XENTRA20</span> at checkout.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-violet-500/50 bg-slate-950/60 px-4 py-2">
            <span className="font-mono text-sm font-bold text-violet-300 tracking-wider">XENTRA20</span>
            <button
              onClick={copyCoupon}
              className="ml-2 rounded-md border border-slate-700 hover:bg-slate-800 px-2.5 py-1 text-xs text-slate-300 flex items-center gap-1 transition"
            >
              {copied ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <div className="font-semibold text-slate-100">Payment Method</div>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300">Manage →</button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3">
              <div className="w-12 h-8 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[10px] font-bold text-white italic">
                VISA
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200">Visa •••• 4242</div>
                <div className="text-xs text-slate-500">Managed by Paddle</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Active
              </span>
            </div>

            <button
              onClick={() => setInfoModal({ title: "Add card", message: "New cards are added during checkout. Click Upgrade Now on any paid plan to manage your payment method through Paddle." })}
              className="w-full rounded-lg border border-dashed border-slate-700 hover:border-violet-500/60 hover:bg-slate-900/60 py-3 text-sm text-slate-400 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Add New Card
            </button>

            <div className="pt-2 border-t border-slate-800/60">
              <div className="text-[10px] text-slate-500 mb-2 text-center">Powered by Paddle</div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <AltPayBadge label="Visa" color="from-blue-700 to-blue-900" />
                <AltPayBadge label="Mastercard" color="from-red-700 to-red-900" />
                <AltPayBadge label="PayPal" color="from-blue-700 to-blue-900" />
                <AltPayBadge label="Apple Pay" color="from-slate-700 to-slate-900" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <div className="font-semibold text-slate-100">Your Usage</div>
              </div>
              <button className="text-xs text-blue-400 hover:text-blue-300">View Details →</button>
            </div>

            <div className="space-y-4">
              {status?.usage && Object.keys(status.usage).length > 0 ? (
                Object.entries(status.usage).slice(0, 5).map(([key, metric]) => {
                  const isUnlimited = metric.limit === -1;
                  const pct = isUnlimited ? 0 : Math.min(100, (metric.used / metric.limit) * 100);
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-400">
                          {USAGE_ICONS[key] || <Sparkles className="w-4 h-4 text-slate-500" />}
                          <span>{metricLabel(key)}</span>
                        </div>
                        <span className="font-mono text-slate-500">
                          {metric.used} / {isUnlimited ? "Unlimited" : metric.limit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all ${usageColor(metric.used, metric.limit)}`}
                          style={{ width: isUnlimited ? "30%" : `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <UsagePreview />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <div className="font-semibold text-slate-100">Recent Transactions</div>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300">View All →</button>
          </div>

          <div className="space-y-2">
            {[
              { name: "Pro Plan (Monthly)", amount: "$9.99", date: "Sep 12, 2025" },
              { name: "File Storage Add-on", amount: "$2.99", date: "Sep 05, 2025" },
              { name: "Plus Plan (Monthly)", amount: "$4.99", date: "Aug 12, 2025" },
            ].map((tx, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{tx.name}</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Completed
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-200">{tx.amount}</div>
                  <div className="text-[11px] text-slate-500">{tx.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TrustBadge icon={<Shield className="w-4 h-4 text-emerald-400" />} title="Secure Payments" subtitle="Bank-level encryption." />
          <TrustBadge icon={<Check className="w-4 h-4 text-cyan-400" />} title="Cancel Anytime" subtitle="No hidden fees." />
          <TrustBadge icon={<Zap className="w-4 h-4 text-amber-400" />} title="Instant Access" subtitle="Immediate after payment." />
          <TrustBadge icon={<Crown className="w-4 h-4 text-violet-400" />} title="24/7 Support" subtitle="We're here to help." />
        </div>
      </div>

      {infoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="max-w-sm w-full rounded-2xl border border-violet-500/40 bg-slate-900 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <div className="font-semibold">{infoModal.title}</div>
              </div>
              <button onClick={() => setInfoModal(null)} className="text-slate-500 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-400">{infoModal.message}</p>
            <button
              onClick={() => setInfoModal(null)}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 py-2 text-sm font-medium text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEFAULT EXPORT — wrapped in Suspense (fixes Vercel prerender error)
// ─────────────────────────────────────────────────────────────
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}

// ── Helpers ──

function renderCell(value: string, highlight?: boolean, isPro?: boolean) {
  if (value.startsWith("♾️")) {
    return <span className="text-violet-300 font-semibold">{value}</span>;
  }
  if (value.startsWith("❌")) {
    return <span className="text-slate-600">{value}</span>;
  }
  if (value.startsWith("$")) {
    return <span className="text-slate-100 font-bold text-sm">{value}</span>;
  }
  if (isPro) {
    return <span className="text-violet-200">{value}</span>;
  }
  return <span>{value}</span>;
}

function mergeWithFallback(apiPlans: Plan[]): Plan[] {
  if (!apiPlans || apiPlans.length === 0) return FALLBACK_PLANS;
  const bySlug = new Map(apiPlans.map((p) => [p.slug, p]));
  return FALLBACK_PLANS.map((fallback) => bySlug.get(fallback.slug) || fallback);
}

function AltPayBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-gradient-to-br ${color} border border-slate-800 text-[10px] font-semibold text-white tracking-wide`}
    >
      {label}
    </span>
  );
}

function UsagePreview() {
  const items = [
    { key: "messages_per_day", label: "AI Chats", used: 842, limit: -1 },
    { key: "learning_max", label: "Learning", used: 12, limit: 1000 },
    { key: "files_storage_mb", label: "File Storage", used: 624, limit: 1024 },
    { key: "ai_agents_max", label: "AI Agents", used: 3, limit: 5 },
  ];
  return (
    <>
      {items.map((m) => {
        const isUnlimited = m.limit === -1;
        const pct = isUnlimited ? 0 : Math.min(100, (m.used / m.limit) * 100);
        return (
          <div key={m.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                {USAGE_ICONS[m.key] || <Sparkles className="w-4 h-4 text-slate-500" />}
                <span>{m.label}</span>
              </div>
              <span className="font-mono text-slate-500">
                {m.used} / {isUnlimited ? "Unlimited" : m.limit >= 1024 ? `${(m.limit / 1024).toFixed(0)} GB` : m.limit}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${usageColor(m.used, m.limit)}`}
                style={{ width: isUnlimited ? "30%" : `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

function TrustBadge({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-200">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{subtitle}</div>
      </div>
    </div>
  );
}