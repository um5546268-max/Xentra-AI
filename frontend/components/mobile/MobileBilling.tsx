"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, Check, Sparkles, Loader2, AlertCircle, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listPlans, getBillingStatus, startCheckout,
  Plan, BillingStatus,
  formatPrice,
} from "@/lib/billing";

const PLAN_STYLES: Record<
  string,
  { gradient: string; border: string; text: string; buttonBg: string; popular?: boolean }
> = {
  free: {
    gradient: "from-slate-800/40 via-slate-900/20 to-slate-950/10",
    border: "border-slate-700/60",
    text: "text-slate-300",
    buttonBg: "bg-slate-800 hover:bg-slate-700 text-slate-300",
  },
  basic: {
    gradient: "from-emerald-900/30 via-emerald-950/10 to-slate-950/10",
    border: "border-emerald-600/40",
    text: "text-emerald-300",
    buttonBg: "bg-emerald-700 hover:bg-emerald-600 text-white",
  },
  pro: {
    gradient: "from-violet-700/40 via-violet-900/20 to-slate-950/10",
    border: "border-violet-500/60",
    text: "text-violet-300",
    buttonBg: "bg-violet-600 hover:bg-violet-500 text-white",
    popular: true,
  },
  ultimate: {
    gradient: "from-amber-900/30 via-amber-950/10 to-slate-950/10",
    border: "border-amber-600/40",
    text: "text-amber-300",
    buttonBg: "bg-amber-600 hover:bg-amber-500 text-white",
  },
};

const FALLBACK_PLANS: Plan[] = [
  { id: "free",     slug: "free",     name: "Free",     description: "Start your journey",             price_cents: 0,    currency: "USD", interval: "month", limits: null, features: null, display_order: 1 },
  { id: "basic",    slug: "basic",    name: "Plus",     description: "For regular learners",            price_cents: 499,  currency: "USD", interval: "month", limits: null, features: null, display_order: 2 },
  { id: "pro",      slug: "pro",      name: "Pro",      description: "For dedicated learners",          price_cents: 999,  currency: "USD", interval: "month", limits: null, features: null, display_order: 3 },
  { id: "ultimate", slug: "ultimate", name: "Ultimate", description: "For professionals & power users", price_cents: 1999, currency: "USD", interval: "month", limits: null, features: null, display_order: 4 },
];

const CARD_FEATURES: Record<string, string[]> = {
  free: [
    "3 searches/day",
    "3 deep research/day",
    "5 AI coding/day",
    "2 h learning/day",
  ],
  basic: [
    "15 searches/day",
    "10 deep research/day",
    "15 AI coding/day",
    "5 h learning/day",
  ],
  pro: [
    "50 searches/day",
    "30 deep research/day",
    "50 AI coding/day",
    "10 h learning/day",
  ],
  ultimate: [
    "150 searches/day",
    "100 deep research/day",
    "150 AI coding/day",
    "Unlimited learning",
  ],
};

export default function MobileBilling() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const currentSlug = status?.plan?.slug || "free";

  const handleUpgrade = async (slug: string) => {
    if (slug === currentSlug) return;
    setCheckoutLoading(slug);
    setError(null);
    try {
      const result = await startCheckout(slug);
      if (result.ok && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setError(
          result.message ||
            "Could not start checkout. Please try again in a moment."
        );
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  const sortedPlans = [...plans].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Xentra Plans</div>
            <div className="text-[11px] text-slate-500">Choose your plan</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        </div>
      )}

      {/* Current plan banner */}
      {status && (
        <div className="px-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 via-violet-900/10 to-slate-900 p-4">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-400">Current Plan</div>
                <div className="text-sm font-bold text-white">
                  {status.plan.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans list */}
      <div className="px-4 pb-4 space-y-3">
        {sortedPlans.map((p) => {
          const isCurrent = p.slug === currentSlug;
          const styles = PLAN_STYLES[p.slug] || PLAN_STYLES.free;
          const features = CARD_FEATURES[p.slug] || [];
          const price = formatPrice(p.price_cents, p.currency);

          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.gradient} p-4 ${
                styles.popular ? "ring-2 ring-violet-500/50" : ""
              }`}
            >
              {styles.popular && !isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/30 whitespace-nowrap">
                    ⭐ Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${styles.text}`}>
                      {p.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Current
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {p.description}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white">{price}</div>
                  {p.price_cents > 0 && (
                    <div className="text-[10px] text-slate-500">per month</div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(p.slug)}
                disabled={isCurrent || checkoutLoading === p.slug}
                className={`w-full rounded-xl py-2.5 text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  isCurrent
                    ? "bg-slate-900/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                    : styles.buttonBg
                }`}
              >
                {checkoutLoading === p.slug ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Opening…
                  </>
                ) : isCurrent ? (
                  "Current Plan"
                ) : p.price_cents === 0 ? (
                  "Switch to Free"
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade Now
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="px-4 pb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-center space-y-1.5">
          <div className="text-[11px] text-slate-500">
            🔒 Secure payments powered by Paddle
          </div>
          <div className="text-[10px] text-slate-600">
            Cancel anytime · No hidden fees
          </div>
        </div>
      </div>
    </div>
  );
}

function mergeWithFallback(apiPlans: Plan[]): Plan[] {
  if (!apiPlans || apiPlans.length === 0) return FALLBACK_PLANS;
  const bySlug = new Map(apiPlans.map((p) => [p.slug, p]));
  return FALLBACK_PLANS.map((fallback) => bySlug.get(fallback.slug) || fallback);
}